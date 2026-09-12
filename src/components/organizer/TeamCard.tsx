import type { Team } from '@/lib/types';
import { formatMoney, formatCV } from '@/lib/gameEngine';
import { MapPin, TrendingUp, Wallet, Briefcase } from 'lucide-react';

export default function TeamCard({ team, onClick }: { team: Team; onClick?: () => void }) {
  const bankrupt = team.status === 'bankrupt' || team.status === 'eliminated';
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border-2 border-[#2A2A2A]/10 p-4 shadow-sm hover:shadow-md hover:border-[#7484FE] transition-all w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#7484FE] flex items-center justify-center text-white font-black text-sm">
            {team.short_name}
          </div>
          <div>
            <div className="font-bold text-[#2A2A2A] text-sm leading-tight">{team.name}</div>
            <div className="text-xs text-[#2A2A2A]/50 font-semibold">Space {team.position}</div>
          </div>
        </div>
        {bankrupt && (
          <span className="bg-red-100 text-red-700 text-xs font-black uppercase px-2 py-0.5 rounded">Bankrupt</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#F7F2F6] rounded-xl px-3 py-2">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-0.5">
            <Wallet size={10} /> Cash
          </div>
          <div className="display text-xl font-black text-[#2A2A2A]">{formatMoney(team.cash)}</div>
        </div>
        <div className="bg-[#F7F2F6] rounded-xl px-3 py-2">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-0.5">
            <TrendingUp size={10} /> Value
          </div>
          <div className="display text-xl font-black text-[#33FF67]">{formatCV(team.company_value)}</div>
        </div>
        <div className="bg-[#F7F2F6] rounded-xl px-3 py-2">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-0.5">
            <Briefcase size={10} /> Business
          </div>
          <div className="display text-xl font-black text-[#7484FE]">{team.businesses_count}/3</div>
        </div>
        <div className="bg-[#F7F2F6] rounded-xl px-3 py-2">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#2A2A2A]/50 mb-0.5">
            <MapPin size={10} /> Pos
          </div>
          <div className="display text-xl font-black text-[#2A2A2A]">{team.position}</div>
        </div>
      </div>
    </button>
  );
}
