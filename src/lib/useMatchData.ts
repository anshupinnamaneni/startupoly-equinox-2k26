import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { Match, Team, TimerState, Transaction, TeamBusiness, Turn, AuditLog } from './types';

export interface MatchData {
  match: Match | null;
  teams: Team[];
  timer: TimerState | null;
  transactions: Transaction[];
  teamBusinesses: TeamBusiness[];
  turns: Turn[];
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
}

export function useMatchData(matchId: string | null) {
  const [data, setData] = useState<MatchData>({
    match: null,
    teams: [],
    timer: null,
    transactions: [],
    teamBusinesses: [],
    turns: [],
    auditLogs: [],
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async (id: string) => {
    const [matchRes, teamsRes, timerRes, txRes, bizRes, turnsRes, auditRes] = await Promise.all([
      supabase.from('matches').select('*').eq('id', id).maybeSingle(),
      supabase.from('teams').select('*').eq('match_id', id).order('sort_order'),
      supabase.from('timer_state').select('*').eq('match_id', id).maybeSingle(),
      supabase.from('transactions').select('*').eq('match_id', id).order('created_at', { ascending: false }).limit(100),
      supabase.from('team_businesses').select('*').eq('match_id', id).eq('status', 'owned').order('purchased_at'),
      supabase.from('turns').select('*').eq('match_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('audit_logs').select('*').eq('match_id', id).order('created_at', { ascending: false }).limit(100),
    ]);

    const error = matchRes.error || teamsRes.error || timerRes.error || txRes.error;
    if (error) {
      setData((d) => ({ ...d, loading: false, error: error.message }));
      return;
    }

    setData({
      match: matchRes.data as Match,
      teams: (teamsRes.data as Team[]) ?? [],
      timer: (timerRes.data as TimerState) ?? null,
      transactions: (txRes.data as Transaction[]) ?? [],
      teamBusinesses: (bizRes.data as TeamBusiness[]) ?? [],
      turns: (turnsRes.data as Turn[]) ?? [],
      auditLogs: (auditRes.data as AuditLog[]) ?? [],
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (!matchId) {
      setData({ match: null, teams: [], timer: null, transactions: [], teamBusinesses: [], turns: [], auditLogs: [], loading: false, error: null });
      return;
    }
    fetchAll(matchId);

    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, () => fetchAll(matchId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `match_id=eq.${matchId}` }, () => fetchAll(matchId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_state', filter: `match_id=eq.${matchId}` }, () => fetchAll(matchId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `match_id=eq.${matchId}` }, () => fetchAll(matchId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_businesses', filter: `match_id=eq.${matchId}` }, () => fetchAll(matchId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turns', filter: `match_id=eq.${matchId}` }, () => fetchAll(matchId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs', filter: `match_id=eq.${matchId}` }, () => fetchAll(matchId))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId, fetchAll]);

  return data;
}
