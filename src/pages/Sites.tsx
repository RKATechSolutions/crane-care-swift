import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Search, MapPin, ChevronRight, LogOut } from 'lucide-react';

export default function Sites() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');

  const filtered = state.sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Select Site"
        subtitle={state.currentUser?.name}
      />

      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites..."
            className="w-full tap-target pl-10 pr-4 border border-border rounded-xl bg-muted/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1">
        {filtered.map(site => (
          <button
            key={site.id}
            onClick={() => dispatch({ type: 'SELECT_SITE', payload: site })}
            className="w-full text-left px-4 py-4 border-b border-border active:bg-muted transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{site.name}</p>
              <p className="text-sm text-muted-foreground truncate">{site.address}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{site.cranes.length} crane{site.cranes.length !== 1 ? 's' : ''}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No sites found
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => dispatch({ type: 'LOGOUT' })}
          className="w-full tap-target bg-muted rounded-xl text-muted-foreground font-medium text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
