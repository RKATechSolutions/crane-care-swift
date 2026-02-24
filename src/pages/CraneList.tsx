import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { useState, useEffect } from 'react';
import { PlayCircle, Info, Package, Plus, Pencil } from 'lucide-react';
import { Crane, InspectionItemResult } from '@/types/inspection';
import { supabase } from '@/integrations/supabase/client';
import { AddAssetForm } from '@/components/AddAssetForm';
import { AssetDetailModal } from '@/components/AssetDetailModal';

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
}

export default function CraneList() {
  const { state, dispatch } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const [dbAssets, setDbAssets] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DbAsset | null>(null);
  const site = state.selectedSite;

  useEffect(() => {
    if (!site) {
      setLoading(false);
      return;
    }
    const fetchAssets = async () => {
      setLoading(true);
      const selectFields = 'id, class_name, asset_id1, asset_id2, status, account_name, location_name, area_name, description, asset_type, capacity, manufacturer, model_number, serial_number, length_lift, crane_manufacturer';

      // 1. Try client_id if this is a DB client site
      if (site.id.startsWith('db-')) {
        const clientId = site.id.replace('db-', '');
        const { data } = await supabase
          .from('assets')
          .select(selectFields)
          .eq('client_id', clientId)
          .order('class_name');

        if (data && data.length > 0) {
          setDbAssets(data);
          setLoading(false);
          return;
        }
      }

      // 2. Look up client by name match, then query assets by client_id
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name');

      if (clients) {
        const siteLower = site.name.toLowerCase();
        const matchedClient = clients.find(c => {
          const cl = c.client_name.toLowerCase();
          return cl === siteLower || 
                 cl.includes(siteLower) || 
                 siteLower.includes(cl) ||
                 cl.startsWith(siteLower.split(' - ')[0].toLowerCase()) ||
                 siteLower.startsWith(cl.split(' ')[0]);
        });

        if (matchedClient) {
          const { data } = await supabase
            .from('assets')
            .select(selectFields)
            .or(`client_id.eq.${matchedClient.id},account_name.ilike.%${matchedClient.client_name}%`)
            .order('class_name');

          if (data && data.length > 0) {
            setDbAssets(data);
            setLoading(false);
            return;
          }
        }
      }

      // 3. Fallback: direct account_name search
      const searchTerms = [site.name, site.name.split(' - ')[0]];
      for (const term of searchTerms) {
        if (term.length < 3) continue;
        const { data } = await supabase
          .from('assets')
          .select(selectFields)
          .ilike('account_name', `%${term}%`)
          .order('class_name');

        if (data && data.length > 0) {
          setDbAssets(data);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    };

    fetchAssets();
  }, [site?.name, site?.id]);

  // Convert DB assets to Crane objects for inspection compatibility
  if (!site) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No site selected</p>
      </div>
    );
  }

  const assetToCrane = (asset: DbAsset): Crane => ({
    id: `asset-${asset.id}`,
    siteId: site.id,
    name: asset.asset_id2 || asset.description || asset.asset_id1 || asset.class_name,
    type: asset.class_name === 'Overhead Crane' ? 'Single Girder Overhead' : asset.class_name as any,
    serialNumber: asset.serial_number || asset.asset_id1 || 'N/A',
    capacity: asset.capacity || 'N/A',
    manufacturer: asset.crane_manufacturer || asset.manufacturer || 'N/A',
    yearInstalled: 0,
  });

  // Use DB assets if available, otherwise fall back to mock cranes
  const displayAssets = dbAssets.length > 0 ? dbAssets : [];
  const mockCranes = site.cranes || [];
  const hasDbAssets = dbAssets.length > 0;

  const startInspection = (crane: Crane) => {
    dispatch({ type: 'SELECT_CRANE', payload: crane });

    const template = state.templates.find(
      t => t.craneType === crane.type && t.isActive
    );
    if (!template) return;

    const existing = state.inspections.find(
      i => i.craneId === crane.id && i.status !== 'completed'
    );
    if (existing) {
      dispatch({ type: 'START_INSPECTION', payload: existing });
      return;
    }

    const items: InspectionItemResult[] = template.sections.flatMap(section =>
      section.items.map(item => ({
        templateItemId: item.id,
        sectionId: section.id,
        ...(item.type === 'numeric' ? { result: 'pass' as const } : {}),
      }))
    );

    dispatch({
      type: 'START_INSPECTION',
      payload: {
        id: `insp-${Date.now()}`,
        siteId: site.id,
        craneId: crane.id,
        templateId: template.id,
        templateVersion: template.version,
        technicianId: state.currentUser!.id,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        items,
      },
    });
  };

  const getInspectionStatus = (craneId: string) => {
    return state.inspections.find(i => i.craneId === craneId);
  };

  const refreshAssets = async () => {
    const selectFields = 'id, class_name, asset_id1, asset_id2, status, account_name, location_name, area_name, description, asset_type, capacity, manufacturer, model_number, serial_number, length_lift, crane_manufacturer';
    const cId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    if (cId) {
      const { data } = await supabase.from('assets').select(selectFields).eq('client_id', cId).order('class_name');
      if (data && data.length > 0) { setDbAssets(data); return; }
    }
    const { data } = await supabase.from('assets').select(selectFields).ilike('account_name', `%${site.name}%`).order('class_name');
    if (data) setDbAssets(data);
  };

  // Group DB assets by class_name
  const groupedAssets = displayAssets.reduce((acc, asset) => {
    const key = asset.class_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {} as Record<string, DbAsset[]>);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={site.name}
        subtitle={hasDbAssets ? `${dbAssets.length} assets` : `${mockCranes.length} cranes`}
        onBack={() => dispatch({ type: 'BACK_TO_SITES' })}
        onNoteToAdmin={() => setNoteOpen(true)}
      />

      <div className="px-4 py-2 border-b border-border space-y-2">
        <button
          onClick={() => {
            dispatch({ type: 'SELECT_CRANE', payload: { id: '__site_summary__' } as any });
          }}
          className="w-full tap-target bg-foreground text-background rounded-xl font-bold text-base"
        >
          Complete Site Job Summary
        </button>
        <button
          onClick={() => setShowAddAsset(!showAddAsset)}
          className="w-full h-9 bg-primary text-primary-foreground rounded-lg font-medium text-xs flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Asset
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-8 text-center text-muted-foreground">Loading assets...</div>
        )}

        {!loading && hasDbAssets && Object.entries(groupedAssets).map(([className, assets]) => (
          <div key={className}>
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {className} ({assets.length})
              </p>
            </div>
            {assets.map(asset => {
              const crane = assetToCrane(asset);
              const canInspect = asset.class_name === 'Overhead Crane';
              const existing = getInspectionStatus(crane.id);

              return (
                <div key={asset.id} className="border-b border-border">
                  <div className="px-4 py-4">
                    <div onClick={() => setEditingAsset(asset)} role="button" tabIndex={0} className="flex items-start gap-3 cursor-pointer active:bg-muted/50 rounded-lg -mx-1 px-1 py-1 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{crane.name}</p>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {asset.asset_type || asset.class_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[asset.capacity, crane.manufacturer, asset.serial_number ? `SN: ${asset.serial_number}` : null]
                            .filter(Boolean).join(' • ') || 'No details'}
                        </p>
                        {asset.location_name && (
                          <p className="text-xs text-muted-foreground">📍 {asset.location_name}{asset.area_name ? ` — ${asset.area_name}` : ''}</p>
                        )}
                      </div>
                      {existing?.status === 'completed' && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          existing.craneStatus === 'Safe to Operate' ? 'bg-rka-green-light text-rka-green-dark' :
                          existing.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                          'bg-rka-orange-light text-rka-orange'
                        }`}>
                          {existing.craneStatus}
                        </span>
                      )}
                    </div>

                    {canInspect && (
                      <button
                        onClick={() => startInspection(crane)}
                        className={`mt-3 w-full tap-target rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                          existing?.status === 'completed'
                            ? 'bg-muted text-foreground'
                            : existing?.status === 'in_progress'
                            ? 'bg-rka-orange text-destructive-foreground'
                            : 'bg-primary text-primary-foreground shadow-lg'
                        }`}
                      >
                        <PlayCircle className="w-5 h-5" />
                        {existing?.status === 'completed' ? 'View / Re-open' : existing?.status === 'in_progress' ? 'Continue Inspection' : 'Start Inspection'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Fallback to mock cranes if no DB assets */}
        {!loading && !hasDbAssets && mockCranes.map(crane => {
          const canInspect = crane.type === 'Single Girder Overhead';
          const existing = getInspectionStatus(crane.id);

          return (
            <div key={crane.id} className="border-b border-border">
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base">{crane.name}</p>
                    <p className="text-sm text-muted-foreground">{crane.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {crane.capacity} • {crane.manufacturer} • SN: {crane.serialNumber}
                    </p>
                  </div>
                  {existing?.status === 'completed' && (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      existing.craneStatus === 'Safe to Operate' ? 'bg-rka-green-light text-rka-green-dark' :
                      existing.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                      'bg-rka-orange-light text-rka-orange'
                    }`}>
                      {existing.craneStatus}
                    </span>
                  )}
                </div>

                {canInspect ? (
                  <button
                    onClick={() => startInspection(crane)}
                    className={`mt-3 w-full tap-target rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      existing?.status === 'completed'
                        ? 'bg-muted text-foreground'
                        : existing?.status === 'in_progress'
                        ? 'bg-rka-orange text-destructive-foreground'
                        : 'bg-primary text-primary-foreground shadow-lg'
                    }`}
                  >
                    <PlayCircle className="w-5 h-5" />
                    {existing?.status === 'completed' ? 'View / Re-open' : existing?.status === 'in_progress' ? 'Continue Inspection' : 'Start Inspection'}
                  </button>
                ) : (
                  <div className="mt-3 tap-target rounded-xl bg-muted flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Info className="w-4 h-4" />
                    Inspection form not available yet
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && !hasDbAssets && mockCranes.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p className="font-medium">No assets found for this site</p>
            <p className="text-sm mt-1">Import assets via the admin tools</p>
          </div>
        )}
      </div>

      {showAddAsset && (
        <AddAssetForm
          siteId={site.id}
          siteName={site.name}
          clientId={site.id.startsWith('db-') ? site.id.replace('db-', '') : null}
          onSaved={() => {
            setShowAddAsset(false);
            refreshAssets();
          }}
          onCancel={() => setShowAddAsset(false)}
        />
      )}

      {/* Site Job Summary button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => {
            dispatch({ type: 'SELECT_CRANE', payload: { id: '__site_summary__' } as any });
          }}
          className="w-full tap-target bg-foreground text-background rounded-xl font-bold text-base"
        >
          Complete Site Job Summary
        </button>
      </div>

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />

      {editingAsset && (
        <AssetDetailModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSaved={() => {
            setEditingAsset(null);
            refreshAssets();
          }}
        />
      )}
    </div>
  );
}
