import { useState, useEffect } from 'react';
import type { Team, TimerState, Transaction } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { computeTimer, formatTime } from '@/lib/timer';
import { formatMoney, formatCV } from '@/lib/gameEngine';
import TransactionFeed from '@/components/organizer/TransactionFeed';
import ConnectionStatus, { type ConnState } from '@/components/ConnectionStatus';
import { Home, Briefcase, ArrowLeftRight, BookOpen, MoreHorizontal, Wallet, TrendingUp, MapPin } from 'lucide-react';
import { RULES } from '@/lib/rules';

type Tab = 'home' | 'businesses' | 'transactions' | 'rules' | 'more';

export default function TeamMobileApp({
  team,
  timer,
  transactions,
  allTeams,
  connState,
}: {
  team: Team;
  timer: TimerState | null;
  transactions: Transaction[];
  allTeams: Team[];
  connState: ConnState;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const computed = computeTimer(timer, now);

  return (
    <div className="min-h-screen bg-[#F7F2F6] flex flex-col max-w-md mx-auto">
      <header className="bg-[#2A2A2A] text-white px-4 pt-4 pb-3 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[#FFD93D] text-xs font-black uppercase tracking-widest">Startupoly</div>
            <div className="display text-xl font-black leading-none">{team.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus state={connState} />
            <div className="bg-[#7484FE] text-white px-3 py-1.5 rounded-xl">
              <div className="text-xs font-bold uppercase opacity-70">Timer</div>
              <div className="display text-lg font-black leading-none">{formatTime(computed.remainingSeconds)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {tab === 'home' && <HomeTab team={team} transactions={transactions} allTeams={allTeams} />}
        {tab === 'businesses' && <BusinessesTab team={team} />}
        {tab === 'transactions' && <TransactionsTab transactions={transactions} allTeams={allTeams} />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'more' && <MoreTab team={team} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-2 border-[#2A2A2A]/10 flex items-center justify-around py-2 px-2 z-40">
        {[
          { id: 'home' as Tab, label: 'Home', icon: Home },
          { id: 'businesses' as Tab, label: 'Biz', icon: Briefcase },
          { id: 'transactions' as Tab, label: 'Activity', icon: ArrowLeftRight },
          { id: 'rules' as Tab, label: 'Rules', icon: BookOpen },
          { id: 'more' as Tab, label: 'More', icon: MoreHorizontal },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                active ? 'text-[#7484FE]' : 'text-[#2A2A2A]/40'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function HomeTab({ team, transactions, allTeams }: { team: Team; transactions: Transaction[]; allTeams: Team[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">
            <Wallet size={12} /> Cash
          </div>
          <div className="display text-3xl font-black text-[#2A2A2A]">{formatMoney(team.cash)}</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">
            <TrendingUp size={12} /> Company Value
          </div>
          <div className="display text-3xl font-black text-[#33FF67]">{formatCV(team.company_value)}</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">
            <Briefcase size={12} /> Businesses
          </div>
          <div className="display text-3xl font-black text-[#7484FE]">{team.businesses_count}/3</div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-1">
            <MapPin size={12} /> Position
          </div>
          <div className="display text-3xl font-black text-[#2A2A2A]">Space {team.position}</div>
        </div>
      </div>

      <div>
        <h3 className="display text-lg font-black text-[#2A2A2A] mb-2">Recent Activity</h3>
        <div className="bg-[#F7F2F6] rounded-2xl border-2 border-[#2A2A2A]/8 p-3">
          <TransactionFeed transactions={transactions.filter(t => t.team_id === team.id).slice(0, 5)} teams={allTeams} compact />
        </div>
      </div>
    </div>
  );
}

function BusinessesTab({ team }: { team: Team }) {
  return (
    <div className="space-y-3">
      <h3 className="display text-xl font-black text-[#2A2A2A]">My Businesses</h3>
      {team.businesses_count === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2A2A2A]/15 p-8 text-center">
          <Briefcase size={32} className="mx-auto text-[#2A2A2A]/20 mb-2" />
          <p className="text-[#2A2A2A]/50 font-semibold">No businesses yet</p>
          <p className="text-sm text-[#2A2A2A]/30 mt-1">Your team hasn't purchased a business.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
          <p className="text-sm font-semibold text-[#2A2A2A]">{team.businesses_count} business(es) owned.</p>
          <p className="text-xs text-[#2A2A2A]/50 mt-1">Business details are managed by the organizer at the game desk.</p>
        </div>
      )}
    </div>
  );
}

function TransactionsTab({ transactions, allTeams }: { transactions: Transaction[]; allTeams: Team[] }) {
  return (
    <div className="space-y-3">
      <h3 className="display text-xl font-black text-[#2A2A2A]">Transaction History</h3>
      {transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2A2A2A]/15 p-8 text-center">
          <ArrowLeftRight size={32} className="mx-auto text-[#2A2A2A]/20 mb-2" />
          <p className="text-[#2A2A2A]/50 font-semibold">No transactions yet</p>
        </div>
      ) : (
        <TransactionFeed transactions={transactions} teams={allTeams} />
      )}
    </div>
  );
}

function RulesTab() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(0);
  const filtered = RULES.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) || r.body.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-3">
      <h3 className="display text-xl font-black text-[#2A2A2A]">Rules & Regulations</h3>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search rules..."
        className="w-full px-4 py-2.5 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-sm font-medium focus:outline-none focus:border-[#7484FE]"
      />
      {filtered.map((rule, i) => (
        <div key={i} className="bg-white rounded-xl border-2 border-[#2A2A2A]/8 overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 font-bold text-[#2A2A2A] text-sm"
          >
            <span>{rule.title}</span>
            <span className="text-[#7484FE]">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="px-4 pb-3 text-sm text-[#2A2A2A]/70 font-medium whitespace-pre-line">{rule.body}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function MoreTab({ team }: { team: Team }) {
  return (
    <div className="space-y-3">
      <h3 className="display text-xl font-black text-[#2A2A2A]">More</h3>
      <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4 space-y-2">
        <div className="flex justify-between"><span className="font-semibold text-[#2A2A2A]/60 text-sm">Team</span><span className="font-bold text-sm">{team.name}</span></div>
        <div className="flex justify-between"><span className="font-semibold text-[#2A2A2A]/60 text-sm">Status</span><span className="font-bold text-sm capitalize">{team.status}</span></div>
        <div className="flex justify-between"><span className="font-semibold text-[#2A2A2A]/60 text-sm">Position</span><span className="font-bold text-sm">Space {team.position}</span></div>
      </div>
    </div>
  );
}
