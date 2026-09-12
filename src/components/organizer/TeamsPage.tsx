import { useState } from 'react';
import type { Match, Team, TeamBusiness } from '@/lib/types';
import { BUSINESS_DEFINITIONS, formatMoney, formatCV } from '@/lib/gameEngine';
import { adjustCash, adjustCV, buyBusiness, sellBusiness, upgradeBusiness, bankruptTeam, updatePosition, createTeamAccount, rotateTeamPassword } from '@/lib/gameActions';
import { useAuth } from '@/lib/auth';
import TeamCard from './TeamCard';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus, Minus, TrendingUp, TrendingDown, Briefcase, KeyRound, Ban, MapPin, X, Loader2, AlertCircle } from 'lucide-react';
import type { BusinessType } from '@/lib/types';

export default function TeamsPage({ match, teams, teamBusinesses }: { match: Match; teams: Team[]; teamBusinesses: TeamBusiness[] }) {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [modal, setModal] = useState<null | 'cash' | 'cv' | 'buy' | 'sell' | 'upgrade' | 'position' | 'password' | 'bankrupt'>(null);
  const [amount, setAmount] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('EdTech');
  const [sellBizId, setSellBizId] = useState('');
  const [upgradeBizId, setUpgradeBizId] = useState('');

  const teamBiz = teamBusinesses.filter(b => b.team_id === selectedTeam?.id);

  async function handleAction() {
    if (!selectedTeam || !modal) return;
    setBusy(true);
    setError('');
    try {
      if (modal === 'cash') {
        const amt = parseInt(amount) || 0;
        await adjustCash(match.id, selectedTeam, user?.id, amt, `Manual cash ${amt >= 0 ? '+' : ''}${amt}`);
      } else if (modal === 'cv') {
        const amt = parseInt(amount) || 0;
        await adjustCV(match.id, selectedTeam, user?.id, amt, `Manual CV ${amt >= 0 ? '+' : ''}${amt}`);
      } else if (modal === 'buy') {
        await buyBusiness(match.id, selectedTeam, user?.id, bizType);
      } else if (modal === 'sell' && sellBizId) {
        const biz = teamBiz.find(b => b.id === sellBizId);
        if (biz) await sellBusiness(match.id, selectedTeam, user?.id, sellBizId, biz.business_type);
      } else if (modal === 'upgrade' && upgradeBizId) {
        const biz = teamBiz.find(b => b.id === upgradeBizId);
        if (biz) await upgradeBusiness(match.id, selectedTeam, user?.id, upgradeBizId, biz.business_type, biz.upgrade_level);
      } else if (modal === 'position') {
        const pos = parseInt(position) || 0;
        await updatePosition(match.id, selectedTeam, user?.id, pos);
      } else if (modal === 'password' && password) {
        const teamNumber = selectedTeam.sort_order + 1;
        await createTeamAccount(match.id, selectedTeam.id, selectedTeam.name, teamNumber, password);
      } else if (modal === 'bankrupt') {
        await bankruptTeam(match.id, selectedTeam, user?.id);
      }
      setModal(null);
      setAmount('');
      setPosition('');
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
    setBusy(false);
  }

  async function handleRotatePassword() {
    if (!selectedTeam || !password) return;
    setBusy(true);
    setError('');
    try {
      const teamNumber = selectedTeam.sort_order + 1;
      await rotateTeamPassword(match.id, selectedTeam.id, selectedTeam.name, teamNumber, password);
      setModal(null);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rotate password');
    }
    setBusy(false);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="display text-3xl font-black text-[#2A2A2A]">Teams</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} onClick={() => { setSelectedTeam(t); setError(''); }} />
        ))}
      </div>

      {selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setSelectedTeam(null)}>
          <div className="bg-[#F7F2F6] rounded-2xl border-2 border-[#2A2A2A] p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#7484FE] flex items-center justify-center text-white font-black">
                  {selectedTeam.short_name}
                </div>
                <div>
                  <h2 className="display text-xl font-black text-[#2A2A2A]">{selectedTeam.name}</h2>
                  <p className="text-sm text-[#2A2A2A]/50 font-semibold">{formatMoney(selectedTeam.cash)} · {formatCV(selectedTeam.company_value)} · Space {selectedTeam.position}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-[#2A2A2A]/40 hover:text-[#2A2A2A]"><X size={20} /></button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 mb-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              <button onClick={() => { setModal('cash'); setAmount(''); }} className="bg-[#33FF67] text-[#2A2A2A] font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><Plus size={14} /> Cash</button>
              <button onClick={() => { setModal('cv'); setAmount(''); }} className="bg-[#7484FE] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><TrendingUp size={14} /> CV</button>
              <button onClick={() => { setModal('buy'); }} className="bg-[#FFD93D] text-[#2A2A2A] font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><Briefcase size={14} /> Buy Biz</button>
              <button onClick={() => { setModal('position'); setPosition(String(selectedTeam.position)); }} className="bg-white text-[#2A2A2A] font-bold py-2.5 rounded-xl text-sm border-2 border-[#2A2A2A]/10 flex items-center justify-center gap-1.5"><MapPin size={14} /> Position</button>
              <button onClick={() => { setModal('password'); setPassword(''); }} className="bg-[#2A2A2A] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><KeyRound size={14} /> Set Password</button>
              <button onClick={() => { setModal('bankrupt'); }} className="bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><Ban size={14} /> Bankrupt</button>
            </div>

            <div>
              <h3 className="display text-lg font-black text-[#2A2A2A] mb-2">Owned Businesses</h3>
              {teamBiz.length === 0 ? (
                <p className="text-sm text-[#2A2A2A]/40 font-medium py-4 text-center bg-white rounded-xl border-2 border-dashed border-[#2A2A2A]/15">No businesses owned</p>
              ) : (
                <div className="space-y-2">
                  {teamBiz.map((biz) => {
                    const def = BUSINESS_DEFINITIONS[biz.business_type];
                    return (
                      <div key={biz.id} className="bg-white rounded-xl border-2 border-[#2A2A2A]/8 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: def.color }}>{def.short}</div>
                          <div>
                            <div className="font-bold text-sm text-[#2A2A2A]">{biz.business_type}</div>
                            <div className="text-xs text-[#2A2A2A]/50 font-semibold">Level {biz.upgrade_level}/2 · Rent ₹{Math.round(def.baseRent * [0.5, 0.75, 1.0][biz.upgrade_level])}</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {biz.upgrade_level < 2 && (
                            <button onClick={() => { setModal('upgrade'); setUpgradeBizId(biz.id); }} className="bg-[#2A2A2A] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Upgrade</button>
                          )}
                          <button onClick={() => { setModal('sell'); setSellBizId(biz.id); }} className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg">Sell</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modal === 'cash' && (
        <ActionModal title="Adjust Cash" label="Amount (use negative to deduct)" value={amount} setValue={setAmount} busy={busy} onSubmit={handleAction} onCancel={() => setModal(null)} placeholder="100 or -100" />
      )}
      {modal === 'cv' && (
        <ActionModal title="Adjust Company Value" label="Amount (use negative to deduct)" value={amount} setValue={setAmount} busy={busy} onSubmit={handleAction} onCancel={() => setModal(null)} placeholder="200 or -200" />
      )}
      {modal === 'position' && (
        <ActionModal title="Set Position" label="Board space number" value={position} setValue={setPosition} busy={busy} onSubmit={handleAction} onCancel={() => setModal(null)} placeholder="12" />
      )}
      {modal === 'buy' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl border-2 border-[#2A2A2A] p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="display text-xl font-black text-[#2A2A2A] mb-3">Buy Business</h3>
            {error && <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 mb-3"><AlertCircle size={16} />{error}</div>}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.keys(BUSINESS_DEFINITIONS) as BusinessType[]).map((bt) => {
                const def = BUSINESS_DEFINITIONS[bt];
                return (
                  <button key={bt} onClick={() => setBizType(bt)} className={`p-3 rounded-xl border-2 text-left transition-all ${bizType === bt ? 'border-[#7484FE] bg-[#7484FE]/10' : 'border-[#2A2A2A]/10'}`}>
                    <div className="font-bold text-sm text-[#2A2A2A]">{bt}</div>
                    <div className="text-xs text-[#2A2A2A]/50 font-semibold">₹{def.cost} · +{def.initialCV} CV</div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-[#F7F2F6] text-[#2A2A2A] font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={handleAction} disabled={busy} className="flex-1 bg-[#33FF67] text-[#2A2A2A] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Buy'}</button>
            </div>
          </div>
        </div>
      )}
      {modal === 'sell' && (
        <ConfirmModal title="Sell Business?" message="The business will be sold to the bank at original cost. Upgrades are lost." confirmLabel="Sell" danger onConfirm={handleAction} onCancel={() => setModal(null)} />
      )}
      {modal === 'upgrade' && (
        <ConfirmModal title="Upgrade Business?" message={`Cost: ₹${(() => { const b = teamBiz.find(x => x.id === upgradeBizId); return b ? (b.upgrade_level === 0 ? 200 : 250) : 0 })()} · +${(() => { const b = teamBiz.find(x => x.id === upgradeBizId); return b ? (b.upgrade_level === 0 ? 300 : 400) : 0 })()} CV`} confirmLabel="Upgrade" onConfirm={handleAction} onCancel={() => setModal(null)} />
      )}
      {modal === 'password' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl border-2 border-[#2A2A2A] p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="display text-xl font-black text-[#2A2A2A] mb-1">Set Team Password</h3>
            <p className="text-xs text-[#2A2A2A]/50 font-medium mb-3">Creates or updates the login for {selectedTeam?.name}. Email: team{selectedTeam ? selectedTeam.sort_order + 1 : ''}@startupoly.local</p>
            {error && <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700 mb-3"><AlertCircle size={16} />{error}</div>}
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium focus:outline-none focus:border-[#7484FE] mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-[#F7F2F6] text-[#2A2A2A] font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={handleAction} disabled={busy || password.length < 6} className="flex-1 bg-[#2A2A2A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Set Password'}</button>
            </div>
          </div>
        </div>
      )}
      {modal === 'bankrupt' && (
        <ConfirmModal title="Declare Bankrupt?" message="This will mark the team as bankrupt, sell all businesses to the bank, and prevent further play." confirmLabel="Bankrupt" danger onConfirm={handleAction} onCancel={() => setModal(null)} />
      )}
    </div>
  );
}

function ActionModal({ title, label, value, setValue, busy, onSubmit, onCancel, placeholder }: { title: string; label: string; value: string; setValue: (v: string) => void; busy: boolean; onSubmit: () => void; onCancel: () => void; placeholder?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl border-2 border-[#2A2A2A] p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="display text-xl font-black text-[#2A2A2A] mb-1">{title}</h3>
        <p className="text-xs text-[#2A2A2A]/50 font-medium mb-3">{label}</p>
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium focus:outline-none focus:border-[#7484FE] mb-3" />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-[#F7F2F6] text-[#2A2A2A] font-bold py-3 rounded-xl">Cancel</button>
          <button onClick={onSubmit} disabled={busy || !value} className="flex-1 bg-[#7484FE] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}</button>
        </div>
      </div>
    </div>
  );
}
