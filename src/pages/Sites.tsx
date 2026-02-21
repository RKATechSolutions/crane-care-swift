import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Search, MapPin, ChevronRight, LogOut, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DbClient {
  id: string;
  client_name: string;
  location_address: string | null;
  primary_contact_name: string | null;
  primary_contact_mobile: string | null;
  status: string;
}

export default function Sites() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [dbClients, setDbClients] = useState<DbClient[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, client_name, location_address, primary_contact_name, primary_contact_mobile, status')
        .eq('status', 'Active')
        .order('client_name');
      if (data) setDbClients(data);
    };
    fetchClients();
  }, []);

  // Combine mock sites with DB clients (deduped by name)
  const mockSiteNames = new Set(state.sites.map(s => s.name.toLowerCase()));
  const dbSitesAsSites = dbClients
    .filter(c => !mockSiteNames.has(c.client_name.toLowerCase()))
    .map(c => ({
      id: `db-${c.id}`,
      name: c.client_name,
      address: c.location_address || '',
      contactName: c.primary_contact_name || '',
      contactPhone: c.primary_contact_mobile || '',
      cranes: [] as any[],
    }));

  const allSites = [...state.sites, ...dbSitesAsSites];

  const filtered = allSites.filter(s =>
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
            onClick={() => dispatch({ type: 'SELECT_SITE', payload: site as any })}
            className="w-full text-left px-4 py-4 border-b border-border active:bg-muted transition-colors flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {site.cranes.length > 0 ? (
                <MapPin className="w-5 h-5 text-primary" />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{site.name}</p>
              {site.address && <p className="text-sm text-muted-foreground truncate">{site.address}</p>}
              {site.cranes.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">{site.cranes.length} crane{site.cranes.length !== 1 ? 's' : ''}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Client site</p>
              )}
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
