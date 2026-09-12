import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useMatchData } from '@/lib/useMatchData';
import { supabase } from '@/lib/supabase';
import Sidebar, { type OrganizerPage } from './Sidebar';
import Dashboard from './Dashboard';
import TimePage from './TimePage';
import TeamCard from './TeamCard';
import TransactionFeed from './TransactionFeed';
import ConnectionStatus, { type ConnState } from '@/components/ConnectionStatus';
import { RULES } from '@/lib/rules';
import { LogOut, Plus, Loader2, AlertCircle } from 'lucide-react';

export default function OrganizerApp() {
  const { user, matchId } = useAuth();
  const [page, setPage] = useState<OrganizerPage>('dashboard');
  const data = useMatchData(matchId);

  const connState: ConnState = data.loading ? 'syncing' : data.error ? 'offline' : 'live';

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleQuickAction(action: string) {
    if (!matchId || data.teams.length === 0) return;
    if (action === 'add_cash') {
      const team = data.teams[0];
      await supabase.from('teams').update({ cash: team.cash + 100 }).eq('id', team.id);
      await supabase.from('transactions').insert({
        match_id: matchId,
        team_id: team.id,
        actor_id: user?.id,
        transaction_type: 'MANUAL_ADJUSTMENT',
        cash_delta: 100,
        company_value_delta: 0,
        description: 'Manual cash adjustment +₹100',
      });
    }
  }

  if (data.loading) {
    return (
      <div className="min-h-screen bg-[#F7F2F6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#7484FE]" />
      </div>
    );
  }

  if (!data.match) {
    return (
      <div className="poster-grid min-h-screen flex items-center justify-center p-6">
        <div className="bg-[#F7F2F6] rounded-2xl border-2 border-[#2A2A2A] p-8 max-w-md text-center">
          <h2 className="display text-2xl font-black text-[#2A2A2A] mb-2">No Match Found</h2>
          <p className="text-sm text-[#2A2A2A]/60 font-medium mb-4">
            You need to create a match before you can manage the game. Use the setup button below to create your first Startupoly match.
          </p>
          <button
            onClick={async () => {
              const { data: match } = await supabase.from('matches').insert({
                name: 'THE EQUINOX E-SUMMIT 2K26',
                owner_id: user?.id,
              }).select().single();
              if (match) {
                await supabase.from('timer_state').insert({ match_id: match.id });
                const teams = ['Team 1', 'Team 2', 'Team 3', 'Team 4'];
                for (let i = 0; i < teams.length; i++) {
                  await supabase.from('teams').insert({
                    match_id: match.id,
                    name: teams[i],
                    short_name: `T${i + 1}`,
                    sort_order: i,
                  });
                }
                window.location.reload();
              }
            }}
            className="bg-[#2A2A2A] text-white font-bold py-3 px-6 rounded-xl uppercase text-sm"
          >
            Create Match
          </button>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-[#F7F2F6] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-6 max-w-md text-center">
          <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-semibold text-red-700">{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F7F2F6]">
      <Sidebar current={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b-2 border-[#2A2A2A]/8 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <ConnectionStatus state={connState} />
            <span className="text-sm font-bold text-[#2A2A2A]/40 uppercase tracking-wide">{page}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-[#2A2A2A]/60 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {page === 'dashboard' && (
            <Dashboard
              match={data.match}
              teams={data.teams}
              timer={data.timer}
              transactions={data.transactions}
              connState={connState}
              onQuickAction={handleQuickAction}
              onNavigateTime={() => setPage('time')}
            />
          )}
          {page === 'time' && <TimePage match={data.match} timer={data.timer} />}
          {page === 'teams' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Teams</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.teams.map((t) => (
                  <TeamCard key={t.id} team={t} />
                ))}
              </div>
            </div>
          )}
          {page === 'businesses' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Businesses</h1>
              <p className="text-sm text-[#2A2A2A]/50 font-medium">Business ownership and upgrades are managed per-team from the Teams page and quick actions.</p>
            </div>
          )}
          {page === 'transactions' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Transactions</h1>
              <TransactionFeed transactions={data.transactions} teams={data.teams} />
            </div>
          )}
          {page === 'turns' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Turns</h1>
              <p className="text-sm text-[#2A2A2A]/50 font-medium">Turn management with dice recording and three-sixes reversal will appear here.</p>
            </div>
          )}
          {page === 'cards' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Cards & Actions</h1>
              <p className="text-sm text-[#2A2A2A]/50 font-medium">Bonus cards, crisis cards, action tiles, and wildcards are managed here.</p>
            </div>
          )}
          {page === 'rules' && (
            <div className="p-6 space-y-3 max-w-2xl">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Rules & Regulations</h1>
              {RULES.map((rule, i) => (
                <div key={i} className="bg-white rounded-xl border-2 border-[#2A2A2A]/8 p-4">
                  <h3 className="display text-lg font-black text-[#2A2A2A] mb-1">{rule.title}</h3>
                  <p className="text-sm text-[#2A2A2A]/70 font-medium whitespace-pre-line">{rule.body}</p>
                </div>
              ))}
            </div>
          )}
          {page === 'audit' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Audit Log</h1>
              <p className="text-sm text-[#2A2A2A]/50 font-medium">Organizer-only audit trail of all game actions.</p>
            </div>
          )}
          {page === 'settings' && (
            <div className="p-6 space-y-4">
              <h1 className="display text-3xl font-black text-[#2A2A2A]">Settings</h1>
              <p className="text-sm text-[#2A2A2A]/50 font-medium">Match configuration, team management, timer settings, and data export.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
