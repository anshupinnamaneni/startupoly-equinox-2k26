import type { Match, Team, TimerState, Transaction } from '@/lib/types';
import { computeTimer, formatTime } from '@/lib/timer';
import TeamCard from './TeamCard';
import TransactionFeed from './TransactionFeed';
import ConnectionStatus, { type ConnState } from '@/components/ConnectionStatus';
import { Plus, Minus, ArrowUpRight, ArrowDownRight, Briefcase, Layers, Zap, AlertTriangle, Clock } from 'lucide-react';

export default function Dashboard({
  match,
  teams,
  timer,
  transactions,
  connState,
  onQuickAction,
  onNavigateTime,
}: {
  match: Match;
  teams: Team[];
  timer: TimerState | null;
  transactions: Transaction[];
  connState: ConnState;
  onQuickAction: (action: string) => void;
  onNavigateTime: () => void;
}) {
  const computed = computeTimer(timer);
  const recentTx = transactions.slice(0, 8);

  const quickActions = [
    { id: 'add_cash', label: '+ Cash', icon: Plus, color: 'bg-[#33FF67] text-[#2A2A2A]' },
    { id: 'deduct_cash', label: '− Cash', icon: Minus, color: 'bg-red-500 text-white' },
    { id: 'add_cv', label: '+ CV', icon: ArrowUpRight, color: 'bg-[#7484FE] text-white' },
    { id: 'deduct_cv', label: '− CV', icon: ArrowDownRight, color: 'bg-[#FF6B6B] text-white' },
    { id: 'buy_business', label: 'Buy', icon: Briefcase, color: 'bg-[#FFD93D] text-[#2A2A2A]' },
    { id: 'upgrade', label: 'Upgrade', icon: Layers, color: 'bg-[#2A2A2A] text-white' },
    { id: 'bonus', label: 'Bonus', icon: Zap, color: 'bg-[#33FF67] text-[#2A2A2A]' },
    { id: 'crisis', label: 'Crisis', icon: AlertTriangle, color: 'bg-red-500 text-white' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-3xl font-black text-[#2A2A2A]">Dashboard</h1>
          <p className="text-sm text-[#2A2A2A]/50 font-semibold">{match.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus state={connState} />
          <button
            onClick={onNavigateTime}
            className="flex items-center gap-2 bg-[#2A2A2A] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#7484FE] transition-colors"
          >
            <Clock size={16} />
            <span className="display text-lg font-black">{formatTime(computed.remainingSeconds)}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">Match Status</div>
          <div className="display text-2xl font-black text-[#2A2A2A] capitalize">{match.status}</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">Round</div>
          <div className="display text-2xl font-black text-[#7484FE]">{match.round_number}</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">Teams</div>
          <div className="display text-2xl font-black text-[#33FF67]">{teams.filter(t => t.status === 'active').length}/{teams.length}</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">Transactions</div>
          <div className="display text-2xl font-black text-[#FFD93D]">{transactions.length}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="display text-xl font-black text-[#2A2A2A]">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                onClick={() => onQuickAction(qa.id)}
                className={`${qa.color} rounded-xl p-3 font-bold text-xs uppercase flex flex-col items-center gap-1.5 hover:scale-105 transition-transform shadow-sm`}
              >
                <Icon size={18} />
                {qa.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="display text-xl font-black text-[#2A2A2A] mb-3">Teams</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="display text-xl font-black text-[#2A2A2A] mb-3">Recent Transactions</h2>
          <div className="bg-[#F7F2F6] rounded-2xl border-2 border-[#2A2A2A]/8 p-3">
            <TransactionFeed transactions={recentTx} teams={teams} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
