import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { mockUsers } from '@/data/mockData';
import { User } from '@/types/inspection';

export default function Login() {
  const { dispatch } = useApp();
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const technicians = mockUsers.filter(u => u.role === 'technician');
  const admin = mockUsers.find(u => u.role === 'admin');

  const handleTechnicianSelect = (user: typeof mockUsers[0]) => {
    dispatch({ type: 'LOGIN', payload: user as User });
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 4 && admin) {
        if (newPin === admin.pin) {
          dispatch({ type: 'LOGIN', payload: admin as User });
        } else {
          setError('Incorrect PIN');
          setTimeout(() => setPin(''), 300);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mb-4">
          <span className="text-primary-foreground font-black text-xl">RKA</span>
        </div>
        <h1 className="text-2xl font-black mb-1">RKA Inspections</h1>
        <p className="text-muted-foreground text-sm mb-8">Internal Crane Inspection System</p>

        {!showAdminPin ? (
          <div className="w-full max-w-sm space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select Technician</p>
            {technicians.map(user => (
              <button
                key={user.id}
                onClick={() => handleTechnicianSelect(user)}
                className="w-full tap-target bg-muted rounded-xl px-5 text-left font-semibold text-base active:bg-foreground/10 transition-colors"
              >
                {user.name}
              </button>
            ))}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowAdminPin(true)}
                className="w-full tap-target bg-primary/10 text-primary rounded-xl px-5 font-semibold text-sm"
              >
                Admin Login
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xs">
            <button
              onClick={() => { setShowAdminPin(false); setPin(''); setError(''); }}
              className="text-sm text-primary font-medium mb-6 block"
            >
              ← Back
            </button>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-center mb-4">Admin PIN</p>
            
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < pin.length ? 'bg-primary scale-110' : 'bg-border'
                  }`}
                />
              ))}
            </div>

            {error && <p className="text-rka-red text-sm text-center font-medium mb-3">{error}</p>}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => handlePinDigit(String(n))}
                  className="tap-target h-16 bg-muted rounded-xl text-xl font-bold active:bg-foreground/10 transition-colors"
                >
                  {n}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinDigit('0')}
                className="tap-target h-16 bg-muted rounded-xl text-xl font-bold active:bg-foreground/10 transition-colors"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="tap-target h-16 rounded-xl text-xl font-bold text-muted-foreground active:bg-muted transition-colors"
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
