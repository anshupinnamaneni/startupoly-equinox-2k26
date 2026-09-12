/*
# Create Startupoly core match data

1. New Tables
- `matches`: one live Startupoly event, owned by the authenticated organizer, with authoritative timing configuration and lifecycle state.
- `teams`: teams participating in a match, including financial totals, businesses count, position, and status.
- `team_members`: links authenticated team accounts to one team without storing passwords.
- `timer_state`: the server-authoritative countdown timestamps and status for a match.
- `transactions`: append-only financial and game event ledger for a match.

2. Security
- Row Level Security is enabled on every table.
- Organizers can manage the matches they own and all child records under those matches.
- Team members can read their own team and the shared match feed, but cannot create or alter game state.
- Transaction history is append-only for clients: inserts are restricted to the organizer and updates/deletes are not exposed.

3. Important Notes
- Timer state stores timestamps rather than a browser countdown, allowing refresh-safe calculations.
- Financial totals are stored on teams for fast reads and should be changed only by organizer-controlled operations.
- No passwords or password hashes are stored in this schema; Supabase Auth remains responsible for authentication.
*/

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'THE EQUINOX E-SUMMIT 2K26',
  status text NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'live', 'paused', 'ended', 'locked')),
  round_number integer NOT NULL DEFAULT 1 CHECK (round_number > 0),
  duration_seconds integer NOT NULL DEFAULT 3000 CHECK (duration_seconds > 0),
  setup_seconds integer NOT NULL DEFAULT 300,
  wrap_up_seconds integer NOT NULL DEFAULT 300,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text NOT NULL,
  cash integer NOT NULL DEFAULT 1000 CHECK (cash >= 0),
  company_value integer NOT NULL DEFAULT 0 CHECK (company_value >= 0),
  businesses_count integer NOT NULL DEFAULT 0 CHECK (businesses_count >= 0 AND businesses_count <= 3),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'bankrupt', 'eliminated')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, short_name)
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.timer_state (
  match_id uuid PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'running', 'paused', 'complete', 'locked')),
  phase text NOT NULL DEFAULT 'setup' CHECK (phase IN ('setup', 'match', 'wrap_up', 'complete')),
  phase_duration_seconds integer NOT NULL DEFAULT 300,
  started_at timestamptz,
  paused_at timestamptz,
  total_paused_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  cash_delta integer NOT NULL DEFAULT 0,
  company_value_delta integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  turn_id uuid,
  business_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversal_of uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS teams_match_id_idx ON public.teams(match_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS transactions_match_created_idx ON public.transactions(match_id, created_at DESC);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizers manage own matches" ON public.matches;
CREATE POLICY "organizers manage own matches" ON public.matches FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "members read matches" ON public.matches;
CREATE POLICY "members read matches" ON public.matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id WHERE t.match_id = matches.id AND tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "organizers manage teams" ON public.teams;
CREATE POLICY "organizers manage teams" ON public.teams FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = teams.match_id AND m.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = teams.match_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "members read own team" ON public.teams;
CREATE POLICY "members read own team" ON public.teams FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "organizers manage team members" ON public.team_members;
CREATE POLICY "organizers manage team members" ON public.team_members FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t JOIN public.matches m ON m.id = t.match_id WHERE t.id = team_members.team_id AND m.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.teams t JOIN public.matches m ON m.id = t.match_id WHERE t.id = team_members.team_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "members read own membership" ON public.team_members;
CREATE POLICY "members read own membership" ON public.team_members FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "organizers manage timers" ON public.timer_state;
CREATE POLICY "organizers manage timers" ON public.timer_state FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = timer_state.match_id AND m.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = timer_state.match_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "members read timers" ON public.timer_state;
CREATE POLICY "members read timers" ON public.timer_state FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id WHERE t.match_id = timer_state.match_id AND tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "organizers create transactions" ON public.transactions;
CREATE POLICY "organizers create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = transactions.match_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "organizers read transactions" ON public.transactions;
CREATE POLICY "organizers read transactions" ON public.transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = transactions.match_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "members read shared transactions" ON public.transactions;
CREATE POLICY "members read shared transactions" ON public.transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id WHERE t.match_id = transactions.match_id AND tm.user_id = auth.uid()));
