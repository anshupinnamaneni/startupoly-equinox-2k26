import type { TimerState } from './types';

export interface ComputedTimer {
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  phase: TimerState['phase'];
  status: TimerState['status'];
}

export function computeTimer(state: TimerState | null, now: number = Date.now()): ComputedTimer {
  if (!state) {
    return { remainingSeconds: 0, totalSeconds: 0, progress: 0, isRunning: false, isPaused: false, isComplete: false, phase: 'setup', status: 'ready' };
  }

  const total = state.phase_duration_seconds;

  if (state.status === 'complete' || state.status === 'locked') {
    return { remainingSeconds: 0, totalSeconds: total, progress: 1, isRunning: false, isPaused: false, isComplete: true, phase: state.phase, status: state.status };
  }

  if (state.status === 'ready' || !state.started_at) {
    return { remainingSeconds: total, totalSeconds: total, progress: 0, isRunning: false, isPaused: false, isComplete: false, phase: state.phase, status: state.status };
  }

  const startMs = new Date(state.started_at).getTime();
  const pausedMs = state.paused_at ? new Date(state.paused_at).getTime() : null;
  const elapsedPaused = state.total_paused_seconds * 1000;

  let elapsedMs: number;
  if (state.status === 'running') {
    elapsedMs = now - startMs - elapsedPaused;
  } else {
    elapsedMs = (pausedMs ?? now) - startMs - elapsedPaused;
  }

  const remaining = Math.max(0, total - Math.floor(elapsedMs / 1000));

  return {
    remainingSeconds: remaining,
    totalSeconds: total,
    progress: total > 0 ? 1 - remaining / total : 0,
    isRunning: state.status === 'running',
    isPaused: state.status === 'paused',
    isComplete: remaining <= 0,
    phase: state.phase,
    status: state.status,
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTimeLong(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
