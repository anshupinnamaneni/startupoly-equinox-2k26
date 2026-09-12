import { supabase } from './supabase';
import type { Team, BusinessType, TransactionType } from './types';
import {
  BUSINESS_DEFINITIONS, MAX_BUSINESSES, MAX_UPGRADES,
  upgradeCost, upgradeCV, clampCash, clampCV,
  BONUS_CARDS, CRISIS_CARDS,
} from './gameEngine';

function getFunctionUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return `${url}/functions/v1/manage-teams`;
}

export async function createTeamAccount(matchId: string, teamId: string, teamName: string, teamNumber: number, password: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(getFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'create_team_account', matchId, teamId, teamName, teamNumber, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function rotateTeamPassword(matchId: string, teamId: string, teamName: string, teamNumber: number, password: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(getFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action: 'rotate_password', matchId, teamId, teamName, teamNumber, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function logAudit(matchId: string, actorId: string | undefined, action: string, description: string, entityType?: string, entityId?: string, metadata?: Record<string, unknown>) {
  await supabase.from('audit_logs').insert({
    match_id: matchId,
    actor_id: actorId ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    description,
    metadata: metadata ?? {},
  });
}

async function recordTransaction(
  matchId: string,
  teamId: string,
  actorId: string | undefined,
  type: TransactionType,
  cashDelta: number,
  cvDelta: number,
  description: string,
  businessId?: string,
  metadata?: Record<string, unknown>,
) {
  await supabase.from('transactions').insert({
    match_id: matchId,
    team_id: teamId,
    actor_id: actorId ?? null,
    transaction_type: type,
    cash_delta: cashDelta,
    company_value_delta: cvDelta,
    description,
    business_id: businessId ?? null,
    metadata: metadata ?? {},
  });
}

export async function adjustCash(matchId: string, team: Team, actorId: string | undefined, amount: number, reason: string) {
  const newCash = clampCash(team.cash + amount);
  const actualDelta = newCash - team.cash;
  if (actualDelta === 0) throw new Error('Cash cannot go below ₹0');
  await supabase.from('teams').update({ cash: newCash, updated_at: new Date().toISOString() }).eq('id', team.id);
  await recordTransaction(matchId, team.id, actorId, 'MANUAL_ADJUSTMENT', actualDelta, 0, reason);
  await logAudit(matchId, actorId, 'CASH_ADJUSTMENT', `${team.name}: ${reason}`, 'team', team.id, { amount: actualDelta });
}

export async function adjustCV(matchId: string, team: Team, actorId: string | undefined, amount: number, reason: string) {
  const newCV = clampCV(team.company_value + amount);
  const actualDelta = newCV - team.company_value;
  if (actualDelta === 0) throw new Error('Company Value cannot go below 0');
  await supabase.from('teams').update({ company_value: newCV, updated_at: new Date().toISOString() }).eq('id', team.id);
  await recordTransaction(matchId, team.id, actorId, 'MANUAL_ADJUSTMENT', 0, actualDelta, reason);
  await logAudit(matchId, actorId, 'CV_ADJUSTMENT', `${team.name}: ${reason}`, 'team', team.id, { amount: actualDelta });
}

export async function buyBusiness(matchId: string, team: Team, actorId: string | undefined, businessType: BusinessType) {
  if (team.businesses_count >= MAX_BUSINESSES) throw new Error('Maximum of 3 businesses reached');
  const def = BUSINESS_DEFINITIONS[businessType];
  if (team.cash < def.cost) throw new Error(`Insufficient cash. Need ₹${def.cost}, have ₹${team.cash}`);

  const { data: biz, error: bizErr } = await supabase.from('team_businesses').insert({
    match_id: matchId,
    team_id: team.id,
    business_type: businessType,
    upgrade_level: 0,
  status: 'owned',
  purchased_at: new Date().toISOString(),
  sold_at: null,
  }).select().single();
  if (bizErr) throw new Error(bizErr.message);

  const newCash = team.cash - def.cost;
  const newCV = team.company_value + def.initialCV;
  const newBizCount = team.businesses_count + 1;
  await supabase.from('teams').update({
    cash: newCash,
    company_value: newCV,
    businesses_count: newBizCount,
    updated_at: new Date().toISOString(),
  }).eq('id', team.id);

  await recordTransaction(matchId, team.id, actorId, 'BUY_BUSINESS', -def.cost, def.initialCV, `Purchased ${businessType}`, biz.id, { business_type: businessType });
  await logAudit(matchId, actorId, 'BUSINESS_PURCHASE', `${team.name} purchased ${businessType}`, 'team', team.id, { business_type: businessType });
}

export async function sellBusiness(matchId: string, team: Team, actorId: string | undefined, businessId: string, businessType: BusinessType) {
  const def = BUSINESS_DEFINITIONS[businessType];
  const newCash = team.cash + def.cost;
  const newBizCount = Math.max(0, team.businesses_count - 1);

  await supabase.from('team_businesses').update({
    status: 'sold',
    sold_at: new Date().toISOString(),
  }).eq('id', businessId);

  await supabase.from('teams').update({
    cash: newCash,
    businesses_count: newBizCount,
    updated_at: new Date().toISOString(),
  }).eq('id', team.id);

  await recordTransaction(matchId, team.id, actorId, 'SELL_BUSINESS', def.cost, 0, `Sold ${businessType} to bank`, businessId, { business_type: businessType });
  await logAudit(matchId, actorId, 'BUSINESS_SALE', `${team.name} sold ${businessType}`, 'team', team.id, { business_type: businessType });
}

export async function upgradeBusiness(matchId: string, team: Team, actorId: string | undefined, businessId: string, businessType: BusinessType, currentLevel: number) {
  if (currentLevel >= MAX_UPGRADES) throw new Error('Maximum upgrades reached');
  const cost = upgradeCost(currentLevel);
  const cvGain = upgradeCV(currentLevel);
  if (cost === null || cvGain === null) throw new Error('Cannot upgrade further');
  if (team.cash < cost) throw new Error(`Insufficient cash for upgrade. Need ₹${cost}`);

  await supabase.from('team_businesses').update({
    upgrade_level: currentLevel + 1,
  }).eq('id', businessId);

  const newCash = team.cash - cost;
  const newCV = team.company_value + cvGain;
  await supabase.from('teams').update({
    cash: newCash,
    company_value: newCV,
    updated_at: new Date().toISOString(),
  }).eq('id', team.id);

  await recordTransaction(matchId, team.id, actorId, 'UPGRADE', -cost, cvGain, `Upgraded ${businessType} to level ${currentLevel + 1}`, businessId, { business_type: businessType, new_level: currentLevel + 1 });
  await logAudit(matchId, actorId, 'BUSINESS_UPGRADE', `${team.name} upgraded ${businessType} to level ${currentLevel + 1}`, 'team', team.id, { business_type: businessType });
}

export async function payRent(matchId: string, payingTeam: Team, ownerTeam: Team, actorId: string | undefined, businessType: BusinessType, upgradeLevel: number) {
  const def = BUSINESS_DEFINITIONS[businessType];
  const multiplier = [0.5, 0.75, 1.0][upgradeLevel] ?? 1.0;
  const rent = Math.round(def.baseRent * multiplier);
  if (payingTeam.cash < rent) throw new Error(`Insufficient cash for rent. Need ₹${rent}, have ₹${payingTeam.cash}`);

  const payerNewCash = clampCash(payingTeam.cash - rent);
  const ownerNewCV = ownerTeam.company_value + rent;

  await supabase.from('teams').update({ cash: payerNewCash, updated_at: new Date().toISOString() }).eq('id', payingTeam.id);
  await supabase.from('teams').update({ company_value: ownerNewCV, updated_at: new Date().toISOString() }).eq('id', ownerTeam.id);

  await recordTransaction(matchId, payingTeam.id, actorId, 'PAY_RENT', -rent, 0, `Paid rent for ${businessType} (L${upgradeLevel})`, undefined, { business_type: businessType, owner: ownerTeam.name });
  await recordTransaction(matchId, ownerTeam.id, actorId, 'RECEIVE_RENT', 0, rent, `Received rent for ${businessType} (L${upgradeLevel})`, undefined, { business_type: businessType, payer: payingTeam.name });
  await logAudit(matchId, actorId, 'RENT_PAYMENT', `${payingTeam.name} paid ₹${rent} rent to ${ownerTeam.name}`, 'team', payingTeam.id, { rent, business_type: businessType });
}

export async function applyBonusCard(matchId: string, team: Team, actorId: string | undefined, roll: number, mostExpensiveBusinessCost: number) {
  const card = BONUS_CARDS.find(c => c.roll === roll);
  if (!card) throw new Error(`Invalid bonus card roll: ${roll}`);
  const result = card.apply({ cash: team.cash, businesses_count: team.businesses_count, mostExpensiveBusinessCost });

  const newCash = clampCash(team.cash + result.cashDelta);
  const newCV = clampCV(team.company_value + result.cvDelta);
  const actualCashDelta = newCash - team.cash;
  const actualCVDelta = newCV - team.company_value;

  await supabase.from('teams').update({ cash: newCash, company_value: newCV, updated_at: new Date().toISOString() }).eq('id', team.id);
  await recordTransaction(matchId, team.id, actorId, 'BONUS', actualCashDelta, actualCVDelta, `Bonus Card: ${card.name}`, undefined, { card_name: card.name, roll });
  await logAudit(matchId, actorId, 'BONUS_CARD', `${team.name}: ${card.name}`, 'team', team.id, { card_name: card.name, roll });
}

export async function applyCrisisCard(matchId: string, team: Team, actorId: string | undefined, roll: number) {
  const card = CRISIS_CARDS.find(c => c.roll === roll);
  if (!card) throw new Error(`Invalid crisis card roll: ${roll}`);
  const result = card.apply({ cash: team.cash, businesses_count: team.businesses_count });

  const newCash = clampCash(team.cash + result.cashDelta);
  const newCV = clampCV(team.company_value + result.cvDelta);
  const actualCashDelta = newCash - team.cash;
  const actualCVDelta = newCV - team.company_value;

  await supabase.from('teams').update({ cash: newCash, company_value: newCV, updated_at: new Date().toISOString() }).eq('id', team.id);
  await recordTransaction(matchId, team.id, actorId, 'CRISIS', actualCashDelta, actualCVDelta, `Crisis Card: ${card.name}`, undefined, { card_name: card.name, roll });
  await logAudit(matchId, actorId, 'CRISIS_CARD', `${team.name}: ${card.name}`, 'team', team.id, { card_name: card.name, roll });
}

export async function applyGrowthBonus(matchId: string, team: Team, actorId: string | undefined, crossings: number) {
  const cashGain = 200 * crossings;
  let cvGain = 0;
  const totalBizAfter = team.businesses_count;
  if (totalBizAfter >= 3) cvGain = 500;
  else if (totalBizAfter >= 2) cvGain = 200;

  const newCash = team.cash + cashGain;
  const newCV = team.company_value + cvGain;
  await supabase.from('teams').update({ cash: newCash, company_value: newCV, updated_at: new Date().toISOString() }).eq('id', team.id);
  await recordTransaction(matchId, team.id, actorId, 'GROWTH_BONUS', cashGain, cvGain, `Growth bonus (${crossings} START crossing(s))`, undefined, { crossings });
  await logAudit(matchId, actorId, 'GROWTH_BONUS', `${team.name}: +₹${cashGain} cash, +${cvGain} CV`, 'team', team.id, { crossings });
}

export async function updatePosition(matchId: string, team: Team, actorId: string | undefined, newPosition: number) {
  await supabase.from('teams').update({ position: newPosition, updated_at: new Date().toISOString() }).eq('id', team.id);
  await logAudit(matchId, actorId, 'POSITION_UPDATE', `${team.name} moved to space ${newPosition}`, 'team', team.id, { old_position: team.position, new_position: newPosition });
}

export async function bankruptTeam(matchId: string, team: Team, actorId: string | undefined) {
  await supabase.from('teams').update({ status: 'bankrupt', updated_at: new Date().toISOString() }).eq('id', team.id);
  await supabase.from('team_businesses').update({ status: 'sold', sold_at: new Date().toISOString() }).eq('team_id', team.id).eq('status', 'owned');
  await recordTransaction(matchId, team.id, actorId, 'BANKRUPTCY', 0, 0, 'Team declared bankrupt', undefined, {});
  await logAudit(matchId, actorId, 'BANKRUPTCY', `${team.name} declared bankrupt`, 'team', team.id, {});
}

export async function reverseTransaction(matchId: string, tx: { id: string; team_id: string; cash_delta: number; company_value_delta: number; description: string; transaction_type: TransactionType }, actorId: string | undefined, team: Team) {
  const reverseCash = -tx.cash_delta;
  const reverseCV = -tx.company_value_delta;
  const newCash = clampCash(team.cash + reverseCash);
  const newCV = clampCV(team.company_value + reverseCV);
  const actualCashDelta = newCash - team.cash;
  const actualCVDelta = newCV - team.company_value;

  await supabase.from('teams').update({ cash: newCash, company_value: newCV, updated_at: new Date().toISOString() }).eq('id', team.id);
  await supabase.from('transactions').insert({
    match_id: matchId,
    team_id: tx.team_id,
    actor_id: actorId ?? null,
    transaction_type: 'REVERSAL',
    cash_delta: actualCashDelta,
    company_value_delta: actualCVDelta,
    description: `Reversal: ${tx.description}`,
    reversal_of: tx.id,
    metadata: { original_type: tx.transaction_type },
  });
  await logAudit(matchId, actorId, 'TRANSACTION_REVERSAL', `Reversed: ${tx.description}`, 'transaction', tx.id, { original_tx: tx.id });
}

export async function applyActionTile(matchId: string, team: Team, actorId: string | undefined, action: 'pitch' | 'lose_feature' | 'steal_talent', targetTeam?: Team) {
  if (action === 'lose_feature') {
    const newCV = clampCV(team.company_value - 200);
    const actualDelta = newCV - team.company_value;
    await supabase.from('teams').update({ company_value: newCV, updated_at: new Date().toISOString() }).eq('id', team.id);
    await recordTransaction(matchId, team.id, actorId, 'ACTION_TILE', 0, actualDelta, 'Action Tile: Lose the Feature (−200 CV)', undefined, { action });
    await logAudit(matchId, actorId, 'ACTION_TILE', `${team.name}: Lose the Feature`, 'team', team.id, { action });
  } else if (action === 'steal_talent' && targetTeam) {
    const stolen = Math.min(100, targetTeam.cash);
    const targetNewCash = clampCash(targetTeam.cash - stolen);
    const teamNewCash = team.cash + stolen;
    await supabase.from('teams').update({ cash: targetNewCash, updated_at: new Date().toISOString() }).eq('id', targetTeam.id);
    await supabase.from('teams').update({ cash: teamNewCash, updated_at: new Date().toISOString() }).eq('id', team.id);
    await recordTransaction(matchId, team.id, actorId, 'ACTION_TILE', stolen, 0, `Action Tile: Steal Talent from ${targetTeam.name}`, undefined, { action, target: targetTeam.name });
    await recordTransaction(matchId, targetTeam.id, actorId, 'ACTION_TILE', -stolen, 0, `Action Tile: Talent stolen by ${team.name}`, undefined, { action, source: team.name });
    await logAudit(matchId, actorId, 'ACTION_TILE', `${team.name} stole ₹${stolen} from ${targetTeam.name}`, 'team', team.id, { action, stolen });
  } else if (action === 'pitch') {
    await recordTransaction(matchId, team.id, actorId, 'ACTION_TILE', 0, 0, 'Action Tile: Pitch to Investors (mandatory)', undefined, { action });
    await logAudit(matchId, actorId, 'ACTION_TILE', `${team.name}: Pitch to Investors`, 'team', team.id, { action });
  }
}

export async function recordWildcard(matchId: string, team: Team, actorId: string | undefined, task: string) {
  await recordTransaction(matchId, team.id, actorId, 'WILDCARD', 0, 0, `Wildcard: ${task}`, undefined, { task });
  await logAudit(matchId, actorId, 'WILDCARD', `${team.name}: ${task}`, 'team', team.id, { task });
}
