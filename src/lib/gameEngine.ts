import type { BusinessType } from './types';

export interface BusinessDefinition {
  type: BusinessType;
  cost: number;
  initialCV: number;
  baseRent: number;
  color: string;
  short: string;
}

export const BUSINESS_DEFINITIONS: Record<BusinessType, BusinessDefinition> = {
  EdTech: { type: 'EdTech', cost: 200, initialCV: 150, baseRent: 100, color: '#FF6B6B', short: 'ED' },
  SaaS: { type: 'SaaS', cost: 300, initialCV: 180, baseRent: 150, color: '#7484FE', short: 'SA' },
  'E-Commerce': { type: 'E-Commerce', cost: 300, initialCV: 180, baseRent: 150, color: '#33FF67', short: 'EC' },
  FinTech: { type: 'FinTech', cost: 400, initialCV: 200, baseRent: 200, color: '#FFD93D', short: 'FT' },
  HealthTech: { type: 'HealthTech', cost: 400, initialCV: 200, baseRent: 200, color: '#FF9F43', short: 'HT' },
  'AI/DeepTech': { type: 'AI/DeepTech', cost: 500, initialCV: 250, baseRent: 250, color: '#2A2A2A', short: 'AI' },
};

export const MAX_BUSINESSES = 3;
export const MAX_UPGRADES = 2;
export const STARTING_CASH = 1000;
export const STARTING_CV = 0;
export const GROWTH_BONUS_CASH = 200;
export const UPGRADE_1_COST = 200;
export const UPGRADE_1_CV = 300;
export const UPGRADE_2_COST = 250;
export const UPGRADE_2_CV = 400;

export const RENT_MULTIPLIERS = [0.5, 0.75, 1.0];

export function rentForLevel(businessType: BusinessType, upgradeLevel: number): number {
  const def = BUSINESS_DEFINITIONS[businessType];
  const multiplier = RENT_MULTIPLIERS[upgradeLevel] ?? 1.0;
  return Math.round(def.baseRent * multiplier);
}

export function upgradeCost(level: number): number | null {
  if (level === 0) return UPGRADE_1_COST;
  if (level === 1) return UPGRADE_2_COST;
  return null;
}

export function upgradeCV(level: number): number | null {
  if (level === 0) return UPGRADE_1_CV;
  if (level === 1) return UPGRADE_2_CV;
  return null;
}

export interface BonusCard {
  roll: number;
  name: string;
  description: string;
  apply: (team: { cash: number; businesses_count: number; mostExpensiveBusinessCost: number }) => { cashDelta: number; cvDelta: number; note: string };
}

export const BONUS_CARDS: BonusCard[] = [
  { roll: 1, name: 'Startup Grant', description: '+₹300', apply: () => ({ cashDelta: 300, cvDelta: 0, note: 'Startup Grant' }) },
  { roll: 2, name: 'Viral Growth', description: '+300 CV', apply: () => ({ cashDelta: 0, cvDelta: 300, note: 'Viral Growth' }) },
  { roll: 3, name: 'Government Incentive', description: '+₹200 cash, +200 CV', apply: () => ({ cashDelta: 200, cvDelta: 200, note: 'Government Incentive' }) },
  { roll: 4, name: 'Premium Deal', description: 'Cash = most expensive business cost', apply: (t) => ({ cashDelta: t.mostExpensiveBusinessCost, cvDelta: 0, note: 'Premium Deal' }) },
  { roll: 5, name: 'Founder Bonus', description: '+₹100 per business', apply: (t) => ({ cashDelta: 100 * t.businesses_count, cvDelta: 0, note: 'Founder Bonus' }) },
  { roll: 6, name: 'Lucky Break', description: 'Reroll, receive ₹100 × result', apply: () => ({ cashDelta: 0, cvDelta: 0, note: 'Lucky Break — reroll needed' }) },
];

export interface CrisisCard {
  roll: number;
  name: string;
  description: string;
  apply: (team: { cash: number; businesses_count: number }) => { cashDelta: number; cvDelta: number; note: string };
}

export const CRISIS_CARDS: CrisisCard[] = [
  { roll: 1, name: 'Tax Raid', description: '−₹300', apply: () => ({ cashDelta: -300, cvDelta: 0, note: 'Tax Raid' }) },
  { roll: 2, name: 'Market Crash', description: '−300 CV', apply: () => ({ cashDelta: 0, cvDelta: -300, note: 'Market Crash' }) },
  { roll: 3, name: 'Legal Trouble', description: '−₹200 cash, −200 CV', apply: () => ({ cashDelta: -200, cvDelta: -200, note: 'Legal Trouble' }) },
  { roll: 4, name: 'Burn Rate Spike', description: '−₹100 per business', apply: (t) => ({ cashDelta: -100 * t.businesses_count, cvDelta: 0, note: 'Burn Rate Spike' }) },
  { roll: 5, name: 'Bad PR', description: '−200 CV, −₹100 cash', apply: () => ({ cashDelta: -100, cvDelta: -200, note: 'Bad PR' }) },
  { roll: 6, name: 'Investor Pullout', description: '−₹500 cash', apply: () => ({ cashDelta: -500, cvDelta: 0, note: 'Investor Pullout' }) },
];

export function clampCash(cash: number): number {
  return Math.max(0, cash);
}

export function clampCV(cv: number): number {
  return Math.max(0, cv);
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}₹${Math.abs(n).toLocaleString('en-IN')}`;
}

export function formatCV(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}${Math.abs(n).toLocaleString('en-IN')} CV`;
}
