export type MatchStatus = 'setup' | 'live' | 'paused' | 'ended' | 'locked';
export type TimerStatus = 'ready' | 'running' | 'paused' | 'complete' | 'locked';
export type TimerPhase = 'setup' | 'match' | 'wrap_up' | 'complete';
export type TeamStatus = 'active' | 'bankrupt' | 'eliminated';

export type BusinessType =
  | 'EdTech'
  | 'SaaS'
  | 'E-Commerce'
  | 'FinTech'
  | 'HealthTech'
  | 'AI/DeepTech';

export interface Match {
  id: string;
  owner_id: string;
  name: string;
  status: MatchStatus;
  round_number: number;
  duration_seconds: number;
  setup_seconds: number;
  wrap_up_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  match_id: string;
  name: string;
  short_name: string;
  cash: number;
  company_value: number;
  businesses_count: number;
  position: number;
  status: TeamStatus;
  sort_order: number;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
}

export interface TimerState {
  match_id: string;
  status: TimerStatus;
  phase: TimerPhase;
  phase_duration_seconds: number;
  started_at: string | null;
  paused_at: string | null;
  total_paused_seconds: number;
  completed_at: string | null;
  updated_at: string;
}

export type TransactionType =
  | 'BUY_BUSINESS'
  | 'SELL_BUSINESS'
  | 'PAY_RENT'
  | 'RECEIVE_RENT'
  | 'UPGRADE'
  | 'BONUS'
  | 'CRISIS'
  | 'GROWTH_BONUS'
  | 'START_CROSSING'
  | 'ACTION_TILE'
  | 'WILDCARD'
  | 'MANUAL_ADJUSTMENT'
  | 'REVERSAL'
  | 'BANKRUPTCY'
  | 'DICE'
  | 'INITIAL';

export interface Transaction {
  id: string;
  match_id: string;
  team_id: string | null;
  actor_id: string | null;
  transaction_type: TransactionType;
  cash_delta: number;
  company_value_delta: number;
  description: string;
  turn_id: string | null;
  business_id: string | null;
  created_at: string;
  reversal_of: string | null;
  metadata: Record<string, unknown>;
}

export interface TeamBusiness {
  id: string;
  match_id: string;
  team_id: string;
  business_type: BusinessType;
  upgrade_level: number;
  purchased_at: string;
  sold_at: string | null;
  status: 'owned' | 'sold';
}

export interface Turn {
  id: string;
  match_id: string;
  team_id: string;
  turn_number: number;
  round_number: number;
  dice_result: number | null;
  roll_count: number;
  consecutive_sixes: number;
  start_position: number;
  current_position: number;
  status: 'pending' | 'rolling' | 'moving' | 'applying' | 'completed' | 'cancelled' | 'reversed';
  turn_journal: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface AuditLog {
  id: string;
  match_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'organizer' | 'team';
  teamId?: string;
  matchId?: string;
}
