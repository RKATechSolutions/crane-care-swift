import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { mockUsers } from '@/data/mockData';
import { User } from '@/types/inspection';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          matchAndLogin(session.user.email, session.user.user_metadata?.full_name);
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
      setCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        matchAndLogin(session.user.email, session.user.user_metadata?.full_name);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
  }, []);

  const matchAndLogin = (email: string, googleName?: string) => {
    // Match by email to known users
    const knownUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (knownUser) {
      dispatch({ type: 'LOGIN', payload: knownUser as User });
      return;
    }
    // If not a known user by email, create a session with their Google info
    const user: User = {
      id: `google-${email}`,
      name: googleName || email.split('@')[0],
      email,
      role: 'technician',
    };
    dispatch({ type: 'LOGIN', payload: user });
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
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
  };

  const handleTestLogin = () => {
    const testUser = mockUsers.find(u => u.id === 'test-1');
    if (testUser) {
      dispatch({ type: 'LOGIN', payload: testUser as User });
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4">
          <span className="text-primary-foreground font-black text-xl">RKA</span>
        </div>
        <h1 className="text-2xl font-black mb-1">RKA Inspections</h1>
        <p className="text-muted-foreground text-sm mb-8">Internal Crane Inspection System</p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-14 bg-foreground text-background rounded-xl font-bold text-base flex items-center justify-center gap-3 active:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Sign in with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <button
            onClick={handleTestLogin}
            className="w-full h-12 bg-muted text-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:bg-foreground/10 transition-colors"
          >
            Continue as Test User
          </button>
        </div>
      </div>
    </div>
  );
}
