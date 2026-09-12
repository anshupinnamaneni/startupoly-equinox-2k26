import { AuthProvider, useAuth } from '@/lib/auth';
import LoginScreen from '@/components/LoginScreen';
import OrganizerApp from '@/components/organizer/OrganizerApp';
import TeamApp from '@/components/team/TeamApp';
import { Loader2 } from 'lucide-react';

function AppInner() {
  const { loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F2F6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#7484FE]" />
      </div>
    );
  }

  if (!role) return <LoginScreen />;
  if (role === 'organizer') return <OrganizerApp />;
  if (role === 'team') return <TeamApp />;

  return <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
