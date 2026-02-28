import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import rkaLogo from '@/assets/rka-main-logo.png';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNoteToAdmin?: () => void;
  unsafeBanner?: boolean;
}

export function AppHeader({ title, subtitle, onBack, onNoteToAdmin, unsafeBanner }: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-50">
      {unsafeBanner && (
        <div className="unsafe-banner text-lg tracking-wide">
          ⚠️ UNSAFE TO OPERATE
        </div>
      )}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="tap-target flex items-center justify-center rounded-lg active:bg-muted transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <img src={rkaLogo} alt="RKA Industrial Solutions" className="h-8 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>
        </div>
        {onNoteToAdmin && (
          <button
            onClick={onNoteToAdmin}
            className="tap-target flex items-center justify-center rounded-lg active:bg-muted transition-colors"
            aria-label="Note to Admin"
          >
            <MessageSquarePlus className="w-6 h-6 text-muted-foreground" />
          </button>
        )}
      </header>
    </div>
  );
}
