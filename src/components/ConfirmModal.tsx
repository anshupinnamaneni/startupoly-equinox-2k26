import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl border-2 border-[#2A2A2A] p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          {danger && <AlertTriangle size={20} className="text-red-500" />}
          <h3 className="display text-xl font-black text-[#2A2A2A]">{title}</h3>
        </div>
        <p className="text-sm text-[#2A2A2A]/60 font-medium mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 bg-[#F7F2F6] text-[#2A2A2A] font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#7484FE] hover:bg-[#5a6afe]'} text-white font-bold py-3 rounded-xl transition-colors`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
