import type { Transaction } from '@/lib/types';
import { formatMoney, formatCV } from '@/lib/gameEngine';

export default function TransactionFeed({ transactions, teams, compact }: { transactions: Transaction[]; teams: { id: string; name: string; short_name: string }[]; compact?: boolean }) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-[#2A2A2A]/40 font-semibold text-sm">
        No transactions yet. Game activity will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {transactions.slice(0, compact ? 8 : 50).map((tx) => {
        const team = tx.team_id ? teamMap.get(tx.team_id) : null;
        const time = new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        return (
          <div key={tx.id} className="flex items-center gap-3 bg-white rounded-xl border border-[#2A2A2A]/8 px-3 py-2.5">
            <span className="text-xs font-mono text-[#2A2A2A]/40 w-12 shrink-0">{time}</span>
            {team && (
              <span className="bg-[#7484FE]/15 text-[#7484FE] text-xs font-black px-2 py-0.5 rounded-md shrink-0">
                {team.short_name}
              </span>
            )}
            <span className="text-sm font-semibold text-[#2A2A2A] flex-1 truncate">{tx.description}</span>
            {tx.cash_delta !== 0 && (
              <span className={`text-sm font-black ${tx.cash_delta > 0 ? 'text-[#33FF67]' : 'text-red-500'}`}>
                {formatMoney(tx.cash_delta)}
              </span>
            )}
            {tx.company_value_delta !== 0 && (
              <span className={`text-sm font-black ${tx.company_value_delta > 0 ? 'text-[#7484FE]' : 'text-red-500'}`}>
                {formatCV(tx.company_value_delta)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
