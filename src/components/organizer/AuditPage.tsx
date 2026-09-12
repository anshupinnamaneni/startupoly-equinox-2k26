import type { AuditLog } from '@/lib/types';

export default function AuditPage({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="display text-3xl font-black text-[#2A2A2A]">Audit Log</h1>

      {auditLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#2A2A2A]/15 p-8 text-center">
          <p className="text-[#2A2A2A]/40 font-semibold">No audit entries yet. Organizer actions will be recorded here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {auditLogs.map((log) => {
            const time = new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
            return (
              <div key={log.id} className="bg-white rounded-xl border border-[#2A2A2A]/8 px-3 py-2.5 flex items-center gap-3">
                <span className="text-xs font-mono text-[#2A2A2A]/40 w-12 shrink-0">{time}</span>
                <span className="bg-[#FFD93D]/20 text-[#2A2A2A] text-xs font-black px-2 py-0.5 rounded-md shrink-0 uppercase">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-[#2A2A2A] flex-1">{log.description}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
