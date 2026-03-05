import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { mockUsers } from '@/data/mockData';
import { User } from '@/types/inspection';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          matchAndLogin(session.user.email);
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
      setCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        matchAndLogin(session.user.email);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
  }, []);

  const matchAndLogin = (email: string) => {
    const knownUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (knownUser) {
      dispatch({ type: 'LOGIN', payload: knownUser as User });
    } else {
      toast.error('Your Google account is not authorised to use this app.');
      supabase.auth.signOut();
    }
  };

  const handleSelectUser = async (user: typeof mockUsers[0]) => {
    if (user.id === 'test-1') {
      dispatch({ type: 'LOGIN', payload: user as User });
      return;
    }

    setSelectedUser(user);
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: {
          login_hint: user.email,
        },
      });
      if (result.error) {
        toast.error('Google sign-in failed');
        console.error('Google auth error:', result.error);
      }
    } catch (err) {
      toast.error('Sign-in failed');
      console.error('Sign-in error:', err);
    }
    setLoading(false);
    setSelectedUser(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const realUsers = mockUsers.filter(u => u.id !== 'test-1');
  const testUser = mockUsers.find(u => u.id === 'test-1');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4">
          <span className="text-primary-foreground font-black text-xl">RKA</span>
        </div>
        <h1 className="text-2xl font-black mb-1">RKA Inspections</h1>
        <p className="text-muted-foreground text-sm mb-6">Select your name to sign in</p>

        <div className="w-full max-w-sm space-y-2">
          {realUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              disabled={loading}
              className="w-full h-14 bg-card border border-border rounded-xl px-4 flex items-center justify-between active:bg-muted transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>
              {loading && selectedUser?.id === user.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ))}

          {testUser && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">dev</span>
                </div>
              </div>
              <button
                onClick={() => handleSelectUser(testUser)}
                className="w-full h-12 bg-muted text-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:bg-foreground/10 transition-colors"
              >
                Continue as Test User
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
