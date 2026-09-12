import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Users, Zap, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setBusy(false);
  }

  return (
    <div className="poster-grid min-h-screen flex items-center justify-center p-4 paper-noise">
      <div className="relative w-full max-w-md">
        <div className="bg-[#F7F2F6] rounded-3xl shadow-2xl border-4 border-[#2A2A2A] p-8 relative overflow-hidden">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-[#2A2A2A] text-[#FFD93D] px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
              <Zap size={14} /> The Equinox E-Summit 2K26
            </div>
            <h1 className="display text-5xl font-black text-[#2A2A2A] leading-none mb-1">STARTUPOLY</h1>
            <p className="text-sm font-semibold text-[#7484FE] tracking-wide uppercase">Live Game Control</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#2A2A2A] mb-1.5">
                <Lock size={12} /> Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-[#2A2A2A] font-medium focus:outline-none focus:border-[#7484FE] transition-colors"
                placeholder="organizer@equinox.com"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#2A2A2A] mb-1.5">
                <Users size={12} /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#2A2A2A]/15 bg-white text-[#2A2A2A] font-medium focus:outline-none focus:border-[#7484FE] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-700">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#2A2A2A] text-white font-bold py-3.5 rounded-xl uppercase tracking-wide hover:bg-[#7484FE] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : 'Enter Game'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-dashed border-[#2A2A2A]/15">
            <p className="text-xs text-[#2A2A2A]/60 text-center font-medium">
              Organizers and teams use the same login. Your role is detected automatically.
            </p>
          </div>
        </div>

        <div className="absolute -top-3 -right-3 bg-[#FFD93D] text-[#2A2A2A] text-xs font-black uppercase px-3 py-1.5 rounded-lg border-2 border-[#2A2A2A] rotate-6 shadow-lg">
          LIVE
        </div>
      </div>
    </div>
  );
}
