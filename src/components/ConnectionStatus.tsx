import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export type ConnState = 'live' | 'syncing' | 'offline';

export default function ConnectionStatus({ state }: { state: ConnState }) {
  const config = {
    live: { icon: Wifi, label: 'LIVE', bg: 'bg-[#33FF67]', text: 'text-[#2A2A2A]' },
    syncing: { icon: Loader2, label: 'SYNCING', bg: 'bg-[#FFD93D]', text: 'text-[#2A2A2A]' },
    offline: { icon: WifiOff, label: 'OFFLINE', bg: 'bg-red-500', text: 'text-white' },
  }[state];

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide ${state === 'syncing' ? 'animate-pulse' : ''}`}>
      <Icon size={12} className={state === 'syncing' ? 'animate-spin' : ''} />
      {config.label}
    </div>
  );
}
