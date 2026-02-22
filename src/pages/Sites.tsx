import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Search, MapPin, ChevronRight, LogOut, Building2, Upload, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ImportAssets from './ImportAssets';
import { toast } from 'sonner';

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
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});
  const [showImport, setShowImport] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [importingAroflo, setImportingAroflo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name, location_address, primary_contact_name, primary_contact_mobile, status')
        .eq('status', 'Active')
        .order('client_name');
      if (clients) setDbClients(clients);

      // Fetch asset counts grouped by client_id and account_name
      const { data: assets } = await supabase
        .from('assets')
        .select('client_id, account_name');
      
      if (assets) {
        const counts: Record<string, number> = {};
        for (const a of assets) {
          // Index by client_id
          if (a.client_id) {
            counts[`cid:${a.client_id}`] = (counts[`cid:${a.client_id}`] || 0) + 1;
          }
          // Also index by account_name for fallback
          const name = (a.account_name as string | null)?.toLowerCase();
          if (name) counts[name] = (counts[name] || 0) + 1;
        }
        setAssetCounts(counts);
      }
    };
    fetchData();
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

  const getAssetCount = (siteId: string, siteName: string): number => {
    // 1. Try client_id lookup for DB sites
    if (siteId.startsWith('db-')) {
      const clientId = siteId.replace('db-', '');
      if (assetCounts[`cid:${clientId}`]) return assetCounts[`cid:${clientId}`];
    }
    // 2. Try by client_id from dbClients matching the name
    const matchedClient = dbClients.find(c => c.client_name.toLowerCase() === siteName.toLowerCase());
    if (matchedClient && assetCounts[`cid:${matchedClient.id}`]) {
      return assetCounts[`cid:${matchedClient.id}`];
    }
    // 3. Fallback: account_name match
    const lower = siteName.toLowerCase();
    if (assetCounts[lower]) return assetCounts[lower];
    for (const [key, count] of Object.entries(assetCounts)) {
      if (key.startsWith('cid:')) continue;
      if (key.includes(lower.split(' - ')[0].toLowerCase()) || lower.includes(key.split(' ')[0])) {
        return count;
      }
    }
    return 0;
  };

  const filtered = allSites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    setAddingClient(true);
    const { error } = await supabase.from('clients').insert({
      client_name: newClientName.trim(),
      location_address: newClientAddress.trim() || null,
      primary_contact_name: newClientContact.trim() || null,
      primary_contact_mobile: newClientPhone.trim() || null,
      status: 'Active',
    });
    if (!error) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name, location_address, primary_contact_name, primary_contact_mobile, status')
        .eq('status', 'Active')
        .order('client_name');
      if (clients) setDbClients(clients);
      setNewClientName('');
      setNewClientAddress('');
      setNewClientContact('');
      setNewClientPhone('');
      setShowAddClient(false);
    }
    setAddingClient(false);
  };

  if (showImport) {
    return <ImportAssets onBack={() => setShowImport(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Select Site"
        subtitle={state.currentUser?.name}
      />

      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setImportingAroflo(true);
              try {
                const { data, error } = await supabase.functions.invoke('import-aroflo-clients');
                if (error) throw error;
                if (data?.success) {
                  toast.success(data.message);
                  const { data: clients } = await supabase
                    .from('clients')
                    .select('id, client_name, location_address, primary_contact_name, primary_contact_mobile, status')
                    .eq('status', 'Active')
                    .order('client_name');
                  if (clients) setDbClients(clients);
                } else {
                  toast.error(data?.error || 'Import failed');
                }
              } catch (err: any) {
                toast.error(err.message || 'Failed to import from AroFlo');
              } finally {
                setImportingAroflo(false);
              }
            }}
            disabled={importingAroflo}
            className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${importingAroflo ? 'animate-spin' : ''}`} />
            {importingAroflo ? 'Importing...' : 'Import Clients'}
          </button>
          <button
            onClick={() => setShowAddClient(true)}
            className="flex-1 h-9 bg-accent text-accent-foreground rounded-lg font-medium text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex-1 h-9 bg-accent text-accent-foreground rounded-lg font-medium text-xs flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Assets
          </button>
        </div>
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
        {filtered.map(site => {
          const dbAssetCount = getAssetCount(site.id, site.name);
          const totalEquipment = site.cranes.length > 0 ? site.cranes.length : dbAssetCount;

          return (
            <button
              key={site.id}
              onClick={() => dispatch({ type: 'SELECT_SITE', payload: site as any })}
              className="w-full text-left px-4 py-4 border-b border-border active:bg-muted transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {totalEquipment > 0 ? (
                  <MapPin className="w-5 h-5 text-primary" />
                ) : (
                  <Building2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate">{site.name}</p>
                {site.address && <p className="text-sm text-muted-foreground truncate">{site.address}</p>}
                {totalEquipment > 0 ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{totalEquipment} asset{totalEquipment !== 1 ? 's' : ''}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Client site</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No sites found
          </div>
        )}
      </div>

      {showAddClient && (
        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          <p className="font-semibold text-sm">New Client</p>
          <input
            type="text"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="Client name *"
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={newClientAddress}
            onChange={(e) => setNewClientAddress(e.target.value)}
            placeholder="Address"
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={newClientContact}
            onChange={(e) => setNewClientContact(e.target.value)}
            placeholder="Contact name"
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={newClientPhone}
            onChange={(e) => setNewClientPhone(e.target.value)}
            placeholder="Contact phone"
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddClient}
              disabled={!newClientName.trim() || addingClient}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {addingClient ? 'Saving...' : 'Save Client'}
            </button>
            <button
              onClick={() => setShowAddClient(false)}
              className="flex-1 h-10 bg-muted rounded-lg text-muted-foreground font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
