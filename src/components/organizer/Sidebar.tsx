import { LayoutDashboard, Clock, Users, Briefcase, ArrowLeftRight, Dice5, Layers, BookOpen, ScrollText, Settings } from 'lucide-react';

export type OrganizerPage = 'dashboard' | 'time' | 'teams' | 'businesses' | 'transactions' | 'turns' | 'cards' | 'rules' | 'audit' | 'settings';

const NAV: { id: OrganizerPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'businesses', label: 'Businesses', icon: Briefcase },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'turns', label: 'Turns', icon: Dice5 },
  { id: 'cards', label: 'Cards', icon: Layers },
  { id: 'rules', label: 'Rules', icon: BookOpen },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ current, onNavigate }: { current: OrganizerPage; onNavigate: (p: OrganizerPage) => void }) {
  return (
    <aside className="w-60 shrink-0 bg-[#2A2A2A] text-white flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-white/10">
        <div className="text-[#FFD93D] text-xs font-black uppercase tracking-widest mb-0.5">The Equinox</div>
        <div className="display text-2xl font-black leading-none">STARTUPOLY</div>
        <div className="text-white/40 text-xs font-semibold mt-1">Organizer Desk</div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                active ? 'bg-[#FFD93D] text-[#2A2A2A] shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="text-white/30 text-xs font-semibold">E-Summit 2K26</div>
      </div>
    </aside>
  );
}
