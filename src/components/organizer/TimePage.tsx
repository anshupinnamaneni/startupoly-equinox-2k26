import { useState, useEffect } from 'react';
import type { Match, TimerState } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { computeTimer, formatTime } from '@/lib/timer';
import { Play, Pause, RotateCcw, Square, Lock } from 'lucide-react';

export default function TimePage({ match, timer }: { match: Match; timer: TimerState | null }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const computed = computeTimer(timer, now);
  const isRunning = computed.isRunning;
  const isPaused = computed.isPaused;
  const isComplete = computed.isComplete;

  async function startTimer() {
    if (!timer || !match) return;
    setBusy(true);
    const phase = timer.phase === 'setup' ? 'setup' : timer.phase === 'wrap_up' ? 'wrap_up' : 'match';
    const duration = phase === 'setup' ? match.setup_seconds : phase === 'wrap_up' ? match.wrap_up_seconds : match.duration_seconds;
    await supabase.from('timer_state').upsert({
      match_id: match.id,
      status: 'running',
      phase,
      phase_duration_seconds: duration,
      started_at: new Date().toISOString(),
      paused_at: null,
      total_paused_seconds: 0,
      completed_at: null,
      updated_at: new Date().toISOString(),
    });
    if (match.status === 'setup') {
      await supabase.from('matches').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', match.id);
    }
    setBusy(false);
  }

  async function pauseTimer() {
    if (!timer || !match) return;
    setBusy(true);
    await supabase.from('timer_state').update({
      status: 'paused',
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('match_id', match.id);
    await supabase.from('matches').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', match.id);
    setBusy(false);
  }

  async function resumeTimer() {
    if (!timer || !match) return;
    setBusy(true);
    const pausedMs = timer.paused_at ? new Date(timer.paused_at).getTime() : Date.now();
    const additionalPaused = Math.floor((Date.now() - pausedMs) / 1000);
    await supabase.from('timer_state').update({
      status: 'running',
      paused_at: null,
      total_paused_seconds: timer.total_paused_seconds + additionalPaused,
      updated_at: new Date().toISOString(),
    }).eq('match_id', match.id);
    await supabase.from('matches').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', match.id);
    setBusy(false);
  }

  async function resetTimer() {
    if (!timer || !match) return;
    setBusy(true);
    await supabase.from('timer_state').update({
      status: 'ready',
      phase: 'setup',
      phase_duration_seconds: match.setup_seconds,
      started_at: null,
      paused_at: null,
      total_paused_seconds: 0,
      completed_at: null,
      updated_at: new Date().toISOString(),
    }).eq('match_id', match.id);
    await supabase.from('matches').update({ status: 'setup', updated_at: new Date().toISOString() }).eq('id', match.id);
    setConfirmReset(false);
    setBusy(false);
  }

  async function endMatch() {
    if (!timer || !match) return;
    setBusy(true);
    await supabase.from('timer_state').update({
      status: 'locked',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('match_id', match.id);
    await supabase.from('matches').update({ status: 'locked', updated_at: new Date().toISOString() }).eq('id', match.id);
    setConfirmEnd(false);
    setBusy(false);
  }

  async function advancePhase() {
    if (!timer || !match) return;
    setBusy(true);
    let nextPhase: 'match' | 'wrap_up' = 'match';
    let duration = match.duration_seconds;
    if (timer.phase === 'setup') { nextPhase = 'match'; duration = match.duration_seconds; }
    else if (timer.phase === 'match') { nextPhase = 'wrap_up'; duration = match.wrap_up_seconds; }
    await supabase.from('timer_state').update({
      status: 'ready',
      phase: nextPhase,
      phase_duration_seconds: duration,
      started_at: null,
      paused_at: null,
      total_paused_seconds: 0,
      completed_at: null,
      updated_at: new Date().toISOString(),
    }).eq('match_id', match.id);
    setBusy(false);
  }

  const phaseLabel = computed.phase === 'setup' ? 'SETUP' : computed.phase === 'match' ? 'MATCH LIVE' : computed.phase === 'wrap_up' ? 'WRAP-UP' : 'COMPLETE';
  const phaseColor = computed.phase === 'match' ? 'text-[#33FF67]' : computed.phase === 'wrap_up' ? 'text-[#FFD93D]' : 'text-[#7484FE]';

  return (
    <div className="poster-grid min-h-full flex flex-col items-center justify-center p-6 paper-noise relative">
      <div className="text-center mb-8">
        <div className="text-[#FFD93D] text-sm font-black uppercase tracking-[0.3em] mb-1">The Equinox</div>
        <div className="display text-4xl md:text-5xl font-black text-white tracking-tight">STARTUPOLY</div>
      </div>

      <div className={`display font-black leading-none text-center transition-all ${computed.isComplete ? 'text-[#FF6B6B]' : 'text-white'}`}
           style={{ fontSize: 'clamp(5rem, 18vw, 16rem)' }}>
        {formatTime(computed.remainingSeconds)}
      </div>

      <div className="mt-4 mb-8 flex items-center gap-3">
        <span className={`display text-2xl font-black uppercase tracking-widest ${phaseColor}`}>
          {phaseLabel}
        </span>
        {isComplete && (
          <span className="bg-[#FF6B6B] text-white text-sm font-black uppercase px-3 py-1 rounded-full">
            Time's Up
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isRunning && !isPaused && !isComplete && (
          <button
            onClick={startTimer}
            disabled={busy}
            className="bg-[#33FF67] text-[#2A2A2A] font-black uppercase text-lg px-8 py-4 rounded-2xl border-2 border-[#2A2A2A] shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={22} /> Start
          </button>
        )}
        {isRunning && (
          <button
            onClick={pauseTimer}
            disabled={busy}
            className="bg-[#FFD93D] text-[#2A2A2A] font-black uppercase text-lg px-8 py-4 rounded-2xl border-2 border-[#2A2A2A] shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
          >
            <Pause size={22} /> Pause
          </button>
        )}
        {isPaused && (
          <button
            onClick={resumeTimer}
            disabled={busy}
            className="bg-[#33FF67] text-[#2A2A2A] font-black uppercase text-lg px-8 py-4 rounded-2xl border-2 border-[#2A2A2A] shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={22} /> Resume
          </button>
        )}
        {!isComplete && (
          <button
            onClick={() => setConfirmEnd(true)}
            disabled={busy}
            className="bg-[#FF6B6B] text-white font-black uppercase text-lg px-8 py-4 rounded-2xl border-2 border-[#2A2A2A] shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
          >
            <Square size={20} /> End Match
          </button>
        )}
        <button
          onClick={() => setConfirmReset(true)}
          disabled={busy}
          className="bg-white/10 text-white font-bold uppercase text-sm px-6 py-4 rounded-2xl border-2 border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RotateCcw size={18} /> Reset
        </button>
      </div>

      {(timer?.phase === 'setup' || timer?.phase === 'match') && isComplete && (
        <button
          onClick={advancePhase}
          disabled={busy}
          className="mt-4 bg-[#7484FE] text-white font-bold uppercase text-sm px-6 py-3 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
        >
          Advance to {timer?.phase === 'setup' ? 'Match' : 'Wrap-Up'}
        </button>
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Reset Timer?"
          message="This will reset the timer to setup phase. All game state is preserved."
          confirmLabel="Reset"
          onConfirm={resetTimer}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      {confirmEnd && (
        <ConfirmDialog
          title="End Match?"
          message="This will lock the game. No further financial actions will be allowed."
          confirmLabel="End Match"
          onConfirm={endMatch}
          onCancel={() => setConfirmEnd(false)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl border-2 border-[#2A2A2A] p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={20} className="text-red-500" />
          <h3 className="display text-xl font-black text-[#2A2A2A]">{title}</h3>
        </div>
        <p className="text-sm text-[#2A2A2A]/60 font-medium mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-[#F7F2F6] text-[#2A2A2A] font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
