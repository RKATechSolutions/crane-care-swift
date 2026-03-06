import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Package, Pencil, ChevronDown, Settings, List } from 'lucide-react';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import AdminAssetGroups from '@/components/AdminAssetGroups';

interface DbAsset {
  id: string;
  class_name: string;
  asset_id1: string | null;
  asset_id2: string | null;
  status: string | null;
  account_name: string | null;
  location_name: string | null;
  area_name: string | null;
  description: string | null;
  asset_type: string | null;
  capacity: string | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  length_lift: string | null;
  crane_manufacturer: string | null;
  main_photo_url: string | null;
  client_id: string | null;
}

const SELECT_FIELDS = 'id, class_name, asset_id1, asset_id2, status, account_name, location_name, area_name, description, asset_type, capacity, manufacturer, model_number, serial_number, length_lift, crane_manufacturer, main_photo_url, client_id';

export default function AdminAssets() {
  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingAsset, setEditingAsset] = useState<DbAsset | null>(null);
  const [view, setView] = useState<'list' | 'groups'>('list');

  const fetchAssets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('assets')
      .select(SELECT_FIELDS)
      .order('account_name')
      .order('class_name');
    if (data) setAssets(data as DbAsset[]);
    setLoading(false);
  };

  useEffect(() => { fetchAssets(); }, []);

  // Get unique asset types for filter
  const assetTypes = [...new Set(assets.map(a => a.class_name).filter(Boolean))].sort();

  // Filter assets
  const filtered = assets.filter(a => {
    const matchesSearch = !search || [
      a.description, a.class_name, a.asset_id1, a.asset_id2,
      a.account_name, a.serial_number, a.manufacturer, a.crane_manufacturer,
      a.location_name, a.area_name,
    ].some(f => f && f.toLowerCase().includes(search.toLowerCase()));

    const matchesType = !filterType || a.class_name === filterType;
    return matchesSearch && matchesType;
  });

  // Group by client/account
  const grouped = filtered.reduce((acc, asset) => {
    const key = asset.account_name || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {} as Record<string, DbAsset[]>);

  return (
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setView('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
            view === 'list' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Asset List
        </button>
        <button
          onClick={() => setView('groups')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
            view === 'groups' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Groups & Types
        </button>
      </div>

      {view === 'groups' ? (
        <div className="flex-1 overflow-auto">
          <AdminAssetGroups />
        </div>
      ) : (
      <>
      {/* Search & Filter */}
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="w-full h-10 pl-9 pr-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-sm appearance-none"
          >
            <option value="">All Asset Types ({assets.length})</option>
            {assetTypes.map(t => (
              <option key={t} value={t}>{t} ({assets.filter(a => a.class_name === t).length})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-8 text-center text-muted-foreground">Loading assets…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No assets found</p>
            <p className="text-sm">Try a different search or filter</p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([clientName, clientAssets]) => (
          <div key={clientName}>
            <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0 z-10">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {clientName} ({clientAssets.length})
              </p>
            </div>
            {clientAssets.map(asset => (
              <button
                key={asset.id}
                onClick={() => setEditingAsset(asset)}
                className="w-full text-left border-b border-border px-4 py-3 flex items-center gap-3 active:bg-muted/50 transition-colors"
              >
                {asset.main_photo_url ? (
                  <img
                    src={asset.main_photo_url}
                    alt={asset.description || asset.class_name}
                    className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">
                      {asset.asset_id2 || asset.description || asset.asset_id1 || asset.class_name}
                    </p>
                    <Pencil className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {asset.class_name}{asset.asset_type ? ` • ${asset.asset_type}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[asset.capacity, asset.manufacturer || asset.crane_manufacturer, asset.serial_number ? `SN: ${asset.serial_number}` : null]
                      .filter(Boolean).join(' • ') || 'No details'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  asset.status === 'In Service' ? 'bg-rka-green/20 text-rka-green-dark' :
                  asset.status === 'Out of Service' ? 'bg-rka-red/20 text-rka-red' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {asset.status || 'Unknown'}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {editingAsset && (
        <AssetDetailModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSaved={() => {
            setEditingAsset(null);
            fetchAssets();
          }}
        />
      )}
      </>
      )}
    </div>
  );
}
