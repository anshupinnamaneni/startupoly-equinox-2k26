/*
# Add team_businesses, turns, and audit_logs tables

1. New Tables
- `team_businesses`: Tracks which businesses each team owns, with upgrade level and ownership history.
- `turns`: Records each turn including dice rolls, consecutive sixes, position changes, and turn state for reversal.
- `audit_logs`: Append-only organizer action trail for all game management actions.

2. Security
- RLS enabled on all tables.
- Organizers can manage all records under their matches.
- Team members can read their own team_businesses and turns (read-only).
- Audit logs are organizer-only (read), organizer-only (insert via service role in future).

3. Important Notes
- team_businesses stores the business type and upgrade_level per owned business.
- turns stores a turn_journal snapshot of team state before the turn for three-sixes reversal.
- audit_logs records actor, action type, and metadata for every organizer action.
*/

CREATE TABLE IF NOT EXISTS public.team_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  business_type text NOT NULL,
  upgrade_level integer NOT NULL DEFAULT 0 CHECK (upgrade_level >= 0 AND upgrade_level <= 2),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  sold_at timestamptz,
  status text NOT NULL DEFAULT 'owned' CHECK (status IN ('owned', 'sold'))
);

CREATE INDEX IF NOT EXISTS team_businesses_team_idx ON public.team_businesses(team_id);
CREATE INDEX IF NOT EXISTS team_businesses_match_idx ON public.team_businesses(match_id);

CREATE TABLE IF NOT EXISTS public.turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  turn_number integer NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  dice_result integer,
  roll_count integer NOT NULL DEFAULT 0,
  consecutive_sixes integer NOT NULL DEFAULT 0,
  start_position integer NOT NULL DEFAULT 0,
  current_position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rolling', 'moving', 'applying', 'completed', 'cancelled', 'reversed')),
  turn_journal jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS turns_match_idx ON public.turns(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS turns_team_idx ON public.turns(team_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_match_idx ON public.audit_logs(match_id, created_at DESC);

ALTER TABLE public.team_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizers manage team_businesses" ON public.team_businesses;
CREATE POLICY "organizers manage team_businesses" ON public.team_businesses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = team_businesses.match_id AND m.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = team_businesses.match_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "members read own team_businesses" ON public.team_businesses;
CREATE POLICY "members read own team_businesses" ON public.team_businesses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_businesses.team_id AND tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "organizers manage turns" ON public.turns;
CREATE POLICY "organizers manage turns" ON public.turns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = turns.match_id AND m.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = turns.match_id AND m.owner_id = auth.uid()));

DROP POLICY IF EXISTS "members read turns" ON public.turns;
CREATE POLICY "members read turns" ON public.turns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id WHERE t.match_id = turns.match_id AND tm.user_id = auth.uid()));

DROP POLICY IF EXISTS "organizers manage audit_logs" ON public.audit_logs;
CREATE POLICY "organizers manage audit_logs" ON public.audit_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = audit_logs.match_id AND m.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = audit_logs.match_id AND m.owner_id = auth.uid()));
