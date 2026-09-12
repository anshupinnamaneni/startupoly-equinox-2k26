import { useState } from 'react';
import type { Match, Team } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { BONUS_CARDS, CRISIS_CARDS, BUSINESS_DEFINITIONS } from '@/lib/gameEngine';
import { applyBonusCard, applyCrisisCard, applyActionTile, recordWildcard, applyGrowthBonus } from '@/lib/gameActions';
import { Zap, AlertTriangle, Target, Gift, Loader2, AlertCircle, Sparkles } from 'lucide-react';

type CardMode = 'bonus' | 'crisis' | 'action' | 'wildcard' | 'growth';

export default function CardsPage({ match, teams }: { match: Match; teams: Team[] }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<CardMode>('bonus');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedRoll, setSelectedRoll] = useState<number | null>(null);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [wildcardTask, setWildcardTask] = useState('');
  const [crossings, setCrossings] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tabs: { id: CardMode; label: string; icon: typeof Zap }[] = [
    { id: 'bonus', label: 'Bonus Cards', icon: Zap },
    { id: 'crisis', label: 'Crisis Cards', icon: AlertTriangle },
    { id: 'action', label: 'Action Tiles', icon: Target },
    { id: 'wildcard', label: 'Wildcard', icon: Gift },
    { id: 'growth', label: 'Growth Bonus', icon: Sparkles },
  ];

  async function handleApply() {
    if (!selectedTeamId) { setError('Select a team'); return; }
    setBusy(true); setError(''); setSuccess('');
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) { setError('Team not found'); setBusy(false); return; }

    try {
      if (mode === 'bonus' && selectedRoll !== null) {
        const mostExpensive = Math.max(0, ...teams
          .filter(t => t.id === selectedTeamId)
          .map(() => 500));
        await applyBonusCard(match.id, team, user?.id, selectedRoll, mostExpensive);
        setSuccess(`Applied bonus card to ${team.name}`);
      } else if (mode === 'crisis' && selectedRoll !== null) {
        await applyCrisisCard(match.id, team, user?.id, selectedRoll);
        setSuccess(`Applied crisis card to ${team.name}`);
      } else if (mode === 'action') {
        const action = selectedRoll as unknown as 'pitch' | 'lose_feature' | 'steal_talent';
        const target = targetTeamId ? teams.find(t => t.id === targetTeamId) : undefined;
        await applyActionTile(match.id, team, user?.id, action, target);
        setSuccess(`Applied action tile to ${team.name}`);
      } else if (mode === 'wildcard' && wildcardTask) {
        await recordWildcard(match.id, team, user?.id, wildcardTask);
        setSuccess(`Recorded wildcard for ${team.name}`);
        setWildcardTask('');
      } else if (mode === 'growth') {
        const c = parseInt(crossings) || 1;
        await applyGrowthBonus(match.id, team, user?.id, c);
        setSuccess(`Applied growth bonus to ${team.name}`);
      }
      setSelectedRoll(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
    setBusy(false);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="display text-3xl font-black text-[#2A2A2A]">Cards & Actions</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setMode(tab.id); setError(''); setSuccess(''); setSelectedRoll(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${mode === tab.id ? 'bg-[#2A2A2A] text-white' : 'bg-white text-[#2A2A2A]/60 border-2 border-[#2A2A2A]/10'}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border-2 border-green-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-green-700">
          <Sparkles size={16} /> {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-6 max-w-lg">
        <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium mb-4 focus:outline-none focus:border-[#7484FE]">
          <option value="">Select team...</option>
          {teams.filter(t => t.status === 'active').map((t) => (
            <option key={t.id} value={t.id}>{t.name} — ₹{t.cash} · {t.company_value} CV</option>
          ))}
        </select>

        {mode === 'bonus' && (
          <div className="space-y-2 mb-4">
            {BONUS_CARDS.map((card) => (
              <button key={card.roll} onClick={() => setSelectedRoll(card.roll)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedRoll === card.roll ? 'border-[#33FF67] bg-[#33FF67]/10' : 'border-[#2A2A2A]/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-[#2A2A2A]">{card.roll}.</span> <span className="font-bold text-sm text-[#2A2A2A]">{card.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#2A2A2A]/50">{card.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {mode === 'crisis' && (
          <div className="space-y-2 mb-4">
            {CRISIS_CARDS.map((card) => (
              <button key={card.roll} onClick={() => setSelectedRoll(card.roll)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedRoll === card.roll ? 'border-red-500 bg-red-50' : 'border-[#2A2A2A]/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-[#2A2A2A]">{card.roll}.</span> <span className="font-bold text-sm text-[#2A2A2A]">{card.name}</span>
                  </div>
                  <span className="text-xs font-bold text-red-500">{card.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {mode === 'action' && (
          <div className="space-y-2 mb-4">
            <button onClick={() => setSelectedRoll(0 as unknown as number)} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedRoll === 0 ? 'border-[#7484FE] bg-[#7484FE]/10' : 'border-[#2A2A2A]/10'}`}>
              <span className="font-bold text-sm text-[#2A2A2A]">Pitch to Investors</span>
              <span className="block text-xs text-[#2A2A2A]/50">Mandatory. Failure/refusal: lose next turn.</span>
            </button>
            <button onClick={() => setSelectedRoll(1 as unknown as number)} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedRoll === 1 ? 'border-[#7484FE] bg-[#7484FE]/10' : 'border-[#2A2A2A]/10'}`}>
              <span className="font-bold text-sm text-[#2A2A2A]">Lose the Feature</span>
              <span className="block text-xs text-[#2A2A2A]/50">−200 CV</span>
            </button>
            <button onClick={() => setSelectedRoll(2 as unknown as number)} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedRoll === 2 ? 'border-[#7484FE] bg-[#7484FE]/10' : 'border-[#2A2A2A]/10'}`}>
              <span className="font-bold text-sm text-[#2A2A2A]">Steal Talent</span>
              <span className="block text-xs text-[#2A2A2A]/50">Take ₹100 from another team</span>
            </button>
            {selectedRoll === 2 && (
              <select value={targetTeamId} onChange={(e) => setTargetTeamId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium mt-2">
                <option value="">Target team...</option>
                {teams.filter(t => t.id !== selectedTeamId && t.status === 'active').map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — ₹{t.cash}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === 'wildcard' && (
          <div className="mb-4">
            <input type="text" value={wildcardTask} onChange={(e) => setWildcardTask(e.target.value)} placeholder="Describe the wildcard/chit task..." className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium focus:outline-none focus:border-[#7484FE]" />
          </div>
        )}

        {mode === 'growth' && (
          <div className="mb-4">
            <label className="text-xs font-bold uppercase text-[#2A2A2A]/50 block mb-1">START Crossings</label>
            <input type="number" value={crossings} onChange={(e) => setCrossings(e.target.value)} min="1" className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium focus:outline-none focus:border-[#7484FE]" />
            <p className="text-xs text-[#2A2A2A]/50 mt-1">+₹200 cash per crossing. CV bonus: 2 biz = +200, 3 biz = +500.</p>
          </div>
        )}

        <button onClick={handleApply} disabled={busy} className="w-full bg-[#2A2A2A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
        </button>
      </div>
    </div>
  );
}
