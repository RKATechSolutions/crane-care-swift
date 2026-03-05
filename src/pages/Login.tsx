import { useApp } from '@/contexts/AppContext';
import { mockUsers } from '@/data/mockData';
import { User } from '@/types/inspection';
import { ChevronRight } from 'lucide-react';

export default function Login() {
  const { dispatch } = useApp();

  const handleSelectUser = (user: typeof mockUsers[0]) => {
    dispatch({ type: 'LOGIN', payload: user as User });
  };

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
              className="w-full h-14 bg-card border border-border rounded-xl px-4 flex items-center justify-between active:bg-muted transition-colors"
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
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
