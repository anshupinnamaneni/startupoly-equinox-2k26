import { useAuth } from '@/lib/auth';
import { useMatchData } from '@/lib/useMatchData';
import TeamMobileApp from './TeamMobileApp';
import { Loader2, AlertCircle } from 'lucide-react';

export default function TeamApp() {
  const { teamId, matchId } = useAuth();
  const data = useMatchData(matchId);

  if (data.loading) {
    return (
      <div className="min-h-screen bg-[#F7F2F6] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#7484FE]" />
      </div>
    );
  }

  if (data.error || !data.match) {
    return (
      <div className="min-h-screen bg-[#F7F2F6] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-red-200 p-6 max-w-sm text-center">
          <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-semibold text-red-700">{data.error ?? 'Match not found.'}</p>
        </div>
      </div>
    );
  }

  const team = data.teams.find((t) => t.id === teamId);
  if (!team) {
    return (
      <div className="min-h-screen bg-[#F7F2F6] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border-2 border-[#2A2A2A]/10 p-6 max-w-sm text-center">
          <p className="text-sm font-semibold text-[#2A2A2A]/60">Your team is not part of this match.</p>
        </div>
      </div>
    );
  }

  return (
    <TeamMobileApp
      team={team}
      timer={data.timer}
      transactions={data.transactions}
      allTeams={data.teams}
      connState="live"
    />
  );
}
