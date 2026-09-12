import type { Team, TeamBusiness, BusinessType } from '@/lib/types';
import { BUSINESS_DEFINITIONS } from '@/lib/gameEngine';

export default function BusinessesPage({ teams, teamBusinesses }: { teams: Team[]; teamBusinesses: TeamBusiness[] }) {
  const owned = teamBusinesses.filter(b => b.status === 'owned');

  return (
    <div className="p-6 space-y-4">
      <h1 className="display text-3xl font-black text-[#2A2A2A]">Businesses</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(BUSINESS_DEFINITIONS) as BusinessType[]).map((bt) => {
          const def = BUSINESS_DEFINITIONS[bt];
          return (
            <div key={bt} className="bg-white rounded-2xl border-2 border-[#2A2A2A]/8 p-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm mb-2" style={{ backgroundColor: def.color }}>{def.short}</div>
              <div className="font-bold text-sm text-[#2A2A2A]">{bt}</div>
              <div className="text-xs text-[#2A2A2A]/50 font-semibold mt-1">Cost ₹{def.cost}</div>
              <div className="text-xs text-[#2A2A2A]/50 font-semibold">+{def.initialCV} CV</div>
              <div className="text-xs text-[#2A2A2A]/50 font-semibold">Rent ₹{def.baseRent}</div>
            </div>
          );
        })}
      </div>

      <h2 className="display text-xl font-black text-[#2A2A2A] mt-6">Owned Businesses</h2>
      {owned.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2A2A2A]/15 p-8 text-center">
          <p className="text-[#2A2A2A]/40 font-semibold">No businesses owned yet. Use the Teams page to buy businesses.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {owned.map((biz) => {
            const team = teams.find(t => t.id === biz.team_id);
            const def = BUSINESS_DEFINITIONS[biz.business_type];
            return (
              <div key={biz.id} className="bg-white rounded-xl border-2 border-[#2A2A2A]/8 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: def.color }}>{def.short}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-[#2A2A2A]">{biz.business_type}</div>
                  <div className="text-xs text-[#2A2A2A]/50 font-semibold">{team?.name ?? 'Unknown'} · Level {biz.upgrade_level}/2</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#7484FE]">₹{Math.round(def.baseRent * [0.5, 0.75, 1.0][biz.upgrade_level])}</div>
                  <div className="text-xs text-[#2A2A2A]/40 font-semibold">rent</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
