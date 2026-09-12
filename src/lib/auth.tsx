import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Role = 'organizer' | 'team';

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role | null;
  teamId: string | null;
  matchId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  role: null,
  teamId: null,
  matchId: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    teamId: null,
    matchId: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        resolveRole(session).then((roleInfo) => {
          if (!mounted) return;
          setState({
            user: session.user,
            session,
            role: roleInfo.role,
            teamId: roleInfo.teamId,
            matchId: roleInfo.matchId,
            loading: false,
          });
        });
      } else {
        setState({ user: null, session: null, role: null, teamId: null, matchId: null, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!mounted) return;
        if (session) {
          const roleInfo = await resolveRole(session);
          if (!mounted) return;
          setState({
            user: session.user,
            session,
            role: roleInfo.role,
            teamId: roleInfo.teamId,
            matchId: roleInfo.matchId,
            loading: false,
          });
        } else {
          setState({ user: null, session: null, role: null, teamId: null, matchId: null, loading: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

async function resolveRole(session: Session): Promise<{ role: Role; teamId: string | null; matchId: string | null }> {
  const meta = session.user.app_metadata || {};
  if (meta.role === 'organizer') return { role: 'organizer', teamId: null, matchId: meta.matchId ?? null };
  if (meta.role === 'team') return { role: 'team', teamId: meta.teamId ?? null, matchId: meta.matchId ?? null };

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id, teams(match_id)')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (membership) {
    return { role: 'team', teamId: membership.team_id, matchId: (membership as any).teams?.match_id ?? null };
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (match) return { role: 'organizer', teamId: null, matchId: match.id };

  return { role: 'organizer', teamId: null, matchId: null };
}

export function useAuth() {
  return useContext(AuthContext);
}
