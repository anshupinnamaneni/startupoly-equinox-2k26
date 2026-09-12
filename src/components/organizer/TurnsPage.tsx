import { useState } from 'react';
import type { Match, Team, Turn } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Dice5, Play, Square, Undo2, Loader2, AlertCircle } from 'lucide-react';

export default function TurnsPage({ match, teams, turns }: { match: Match; teams: Team[]; turns: Turn[] }) {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [newPosition, setNewPosition] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [currentTurn, setCurrentTurn] = useState<Turn | null>(null);

  const activeTurns = turns.filter(t => t.status !== 'completed' && t.status !== 'reversed' && t.status !== 'cancelled');
  const recentTurns = turns.slice(0, 10);

  async function startTurn() {
    if (!selectedTeamId) { setError('Select a team first'); return; }
    setBusy(true); setError('');
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) { setError('Team not found'); setBusy(false); return; }

    // Save turn journal snapshot for three-sixes reversal
    const journal = {
      cash: team.cash,
      company_value: team.company_value,
      position: team.position,
      businesses_count: team.businesses_count,
      status: team.status,
    };

    const turnNum = (turns[0]?.turn_number ?? 0) + 1;
    const { data, error: insertErr } = await supabase.from('turns').insert({
      match_id: match.id,
      team_id: selectedTeamId,
      turn_number: turnNum,
      round_number: match.round_number,
      start_position: team.position,
      current_position: team.position,
      status: 'rolling',
      roll_count: 0,
      consecutive_sixes: 0,
      turn_journal: journal,
    }).select().single();

    if (insertErr) { setError(insertErr.message); setBusy(false); return; }
    setCurrentTurn(data);
    setDiceResult(null);
    setNewPosition('');
    setBusy(false);
  }

  async function recordDice() {
    if (!currentTurn || diceResult === null) { setError('Roll a die first'); return; }
    setBusy(true); setError('');

    const newRollCount = currentTurn.roll_count + 1;
    const newConsecutiveSixes = diceResult === 6 ? currentTurn.consecutive_sixes + 1 : 0;

    // Three consecutive sixes: cancel the entire turn and reverse
    if (newConsecutiveSixes >= 3) {
      const team = teams.find(t => t.id === currentTurn.team_id);
      if (team) {
        const journal = currentTurn.turn_journal as { cash: number; company_value: number; position: number };
        // Reverse to journal state
        await supabase.from('teams').update({
          cash: journal.cash,
          company_value: journal.company_value,
          position: journal.position,
          updated_at: new Date().toISOString(),
        }).eq('id', team.id);

        await supabase.from('transactions').insert({
          match_id: match.id,
          team_id: team.id,
          actor_id: user?.id,
          transaction_type: 'REVERSAL',
          cash_delta: 0,
          company_value_delta: 0,
          description: 'Three consecutive sixes — turn cancelled, all effects reversed',
          turn_id: currentTurn.id,
          metadata: { reason: 'three_sixes' },
        });

        await supabase.from('audit_logs').insert({
          match_id: match.id,
          actor_id: user?.id,
          action: 'THREE_SIXES_REVERSAL',
          entity_type: 'turn',
          entity_id: currentTurn.id,
          description: `${team.name}: Three consecutive sixes — turn cancelled`,
        });
      }

      await supabase.from('turns').update({
        status: 'reversed',
        dice_result: diceResult,
        roll_count: newRollCount,
        consecutive_sixes: newConsecutiveSixes,
        completed_at: new Date().toISOString(),
      }).eq('id', currentTurn.id);

      setCurrentTurn(null);
      setDiceResult(null);
      setBusy(false);
      return;
    }

    await supabase.from('turns').update({
      dice_result: diceResult,
      roll_count: newRollCount,
      consecutive_sixes: newConsecutiveSixes,
      status: 'moving',
    }).eq('id', currentTurn.id);

    // Record dice transaction
    const team = teams.find(t => t.id === currentTurn.team_id);
    if (team) {
      await supabase.from('transactions').insert({
        match_id: match.id,
        team_id: team.id,
        actor_id: user?.id,
        transaction_type: 'DICE',
        cash_delta: 0,
        company_value_delta: 0,
        description: `Dice roll: ${diceResult}${diceResult === 6 ? ' (extra roll!)' : ''}`,
        turn_id: currentTurn.id,
        metadata: { dice: diceResult, roll_count: newRollCount, consecutive_sixes: newConsecutiveSixes },
      });
    }

    setCurrentTurn({ ...currentTurn, dice_result: diceResult, roll_count: newRollCount, consecutive_sixes: newConsecutiveSixes, status: 'moving' });
    setBusy(false);
  }

  async function recordMovement() {
    if (!currentTurn) return;
    setBusy(true); setError('');
    const pos = parseInt(newPosition) || 0;
    const team = teams.find(t => t.id === currentTurn.team_id);
    if (team) {
      await supabase.from('teams').update({ position: pos, updated_at: new Date().toISOString() }).eq('id', team.id);
    }
    await supabase.from('turns').update({
      current_position: pos,
      status: 'applying',
    }).eq('id', currentTurn.id);
    setCurrentTurn({ ...currentTurn, current_position: pos, status: 'applying' });
    setBusy(false);
  }

  async function endTurn() {
    if (!currentTurn) return;
    setBusy(true); setError('');
    await supabase.from('turns').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', currentTurn.id);
    setCurrentTurn(null);
    setDiceResult(null);
    setNewPosition('');
    setBusy(false);
  }

  async function cancelTurn() {
    if (!currentTurn) return;
    setBusy(true); setError('');
    const team = teams.find(t => t.id === currentTurn.team_id);
    if (team) {
      const journal = currentTurn.turn_journal as { cash: number; company_value: number; position: number };
      await supabase.from('teams').update({
        cash: journal.cash,
        company_value: journal.company_value,
        position: journal.position,
        updated_at: new Date().toISOString(),
      }).eq('id', team.id);
    }
    await supabase.from('turns').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', currentTurn.id);
    setCurrentTurn(null);
    setDiceResult(null);
    setNewPosition('');
    setBusy(false);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="display text-3xl font-black text-[#2A2A2A]">Turns</h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!currentTurn ? (
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-6 max-w-md">
          <h2 className="display text-lg font-black text-[#2A2A2A] mb-3">Start New Turn</h2>
          <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium mb-3 focus:outline-none focus:border-[#7484FE]">
            <option value="">Select team...</option>
            {teams.filter(t => t.status === 'active').map((t) => (
              <option key={t.id} value={t.id}>{t.name} — Space {t.position}</option>
            ))}
          </select>
          <button onClick={startTurn} disabled={busy || !selectedTeamId} className="w-full bg-[#33FF67] text-[#2A2A2A] font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <><Play size={16} /> Start Turn</>}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-6 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display text-lg font-black text-[#2A2A2A]">Turn #{currentTurn.turn_number}</h2>
            <span className="text-sm font-bold text-[#7484FE]">{teams.find(t => t.id === currentTurn.team_id)?.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-[#F7F2F6] rounded-xl p-2">
              <div className="text-xs font-bold uppercase text-[#2A2A2A]/50">Rolls</div>
              <div className="display text-xl font-black text-[#2A2A2A]">{currentTurn.roll_count}</div>
            </div>
            <div className="bg-[#F7F2F6] rounded-xl p-2">
              <div className="text-xs font-bold uppercase text-[#2A2A2A]/50">Dice</div>
              <div className="display text-xl font-black text-[#7484FE]">{currentTurn.dice_result ?? '—'}</div>
            </div>
            <div className="bg-[#F7F2F6] rounded-xl p-2">
              <div className="text-xs font-bold uppercase text-[#2A2A2A]/50">6s</div>
              <div className={`display text-xl font-black ${currentTurn.consecutive_sixes >= 2 ? 'text-red-500' : 'text-[#2A2A2A]'}`}>{currentTurn.consecutive_sixes}/3</div>
            </div>
          </div>

          {currentTurn.consecutive_sixes >= 2 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2 text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
              <AlertCircle size={14} /> Warning: Two consecutive sixes! One more cancels the turn.
            </div>
          )}

          {currentTurn.status === 'rolling' && (
            <>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => setDiceResult(n)} className={`aspect-square rounded-xl border-2 font-black text-lg flex items-center justify-center transition-all ${diceResult === n ? 'border-[#7484FE] bg-[#7484FE] text-white' : 'border-[#2A2A2A]/15 hover:border-[#7484FE]'}`}><Dice5 size={20} className="hidden" />{n}</button>
                ))}
              </div>
              <button onClick={recordDice} disabled={busy || diceResult === null} className="w-full bg-[#7484FE] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mb-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : `Record Dice: ${diceResult ?? '?'}`}
              </button>
            </>
          )}

          {currentTurn.status === 'moving' && (
            <>
              <input type="number" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} placeholder="New position (space number)" className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium mb-3 focus:outline-none focus:border-[#7484FE]" />
              <button onClick={recordMovement} disabled={busy || !newPosition} className="w-full bg-[#FFD93D] text-[#2A2A2A] font-bold py-3 rounded-xl mb-2 disabled:opacity-50">Record Movement</button>
            </>
          )}

          {currentTurn.status === 'applying' && (
            <button onClick={endTurn} disabled={busy} className="w-full bg-[#33FF67] text-[#2A2A2A] font-bold py-3 rounded-xl mb-2 flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <><Square size={16} /> End Turn</>}
            </button>
          )}

          <button onClick={cancelTurn} disabled={busy} className="w-full bg-red-100 text-red-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            <Undo2 size={14} /> Cancel & Reverse Turn
          </button>
        </div>
      )}

      <div>
        <h2 className="display text-xl font-black text-[#2A2A2A] mb-2">Recent Turns</h2>
        {recentTurns.length === 0 ? (
          <p className="text-sm text-[#2A2A2A]/40 font-medium py-4 text-center bg-white rounded-xl border-2 border-dashed border-[#2A2A2A]/15">No turns recorded yet</p>
        ) : (
          <div className="space-y-2">
            {recentTurns.map((t) => {
              const team = teams.find(x => x.id === t.team_id);
              return (
                <div key={t.id} className="bg-white rounded-xl border-2 border-[#2A2A2A]/8 p-3 flex items-center gap-3 text-sm">
                  <span className="bg-[#7484FE]/15 text-[#7484FE] text-xs font-black px-2 py-0.5 rounded-md">{team?.short_name ?? '?'}</span>
                  <span className="font-semibold text-[#2A2A2A]">Turn {t.turn_number}</span>
                  <span className="text-[#2A2A2A]/50">Dice: {t.dice_result ?? '—'}</span>
                  <span className="text-[#2A2A2A]/50">Pos: {t.start_position} → {t.current_position}</span>
                  <span className="text-[#2A2A2A]/50">Rolls: {t.roll_count}</span>
                  <span className={`font-bold uppercase text-xs ml-auto ${t.status === 'completed' ? 'text-[#33FF67]' : t.status === 'reversed' ? 'text-red-500' : t.status === 'cancelled' ? 'text-[#2A2A2A]/40' : 'text-[#FFD93D]'}`}>{t.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
