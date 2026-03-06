import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Save, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface AssetGroup {
  name: string;
  types: string[];
}

const DEFAULT_GROUPS: AssetGroup[] = [
  { name: 'Overhead Cranes', types: [] },
  { name: 'Jib Cranes', types: [] },
  { name: 'Automatic Cranes', types: [] },
  { name: 'Hoists', types: [] },
  { name: 'Specialised Equipment', types: [] },
];

export default function AdminAssetGroups() {
  const [groups, setGroups] = useState<AssetGroup[]>(DEFAULT_GROUPS);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('admin_config')
      .select('config')
      .eq('id', 'asset_groups')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config) {
          const c = data.config as any;
          if (c.groups?.length) setGroups(c.groups);
        }
        setLoaded(true);
      });
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('admin_config')
      .upsert({ id: 'asset_groups', config: { groups } as any, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Asset groups saved');
    }
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name || groups.some(g => g.name.toLowerCase() === name.toLowerCase())) return;
    setGroups([...groups, { name, types: [] }]);
    setNewGroupName('');
    setSelectedGroup(name);
  };

  const removeGroup = (name: string) => {
    setGroups(groups.filter(g => g.name !== name));
    if (selectedGroup === name) setSelectedGroup(null);
  };

  const addType = () => {
    const t = newTypeName.trim();
    if (!t || !selectedGroup) return;
    setGroups(groups.map(g =>
      g.name === selectedGroup && !g.types.some(x => x.toLowerCase() === t.toLowerCase())
        ? { ...g, types: [...g.types, t] }
        : g
    ));
    setNewTypeName('');
  };

  const removeType = (groupName: string, typeName: string) => {
    setGroups(groups.map(g =>
      g.name === groupName ? { ...g, types: g.types.filter(t => t !== typeName) } : g
    ));
  };

  const activeGroup = groups.find(g => g.name === selectedGroup);

  if (!loaded) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-foreground">Asset Groups & Types</h3>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Changes
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tap a group to manage its asset types. These categories will be available when adding or editing assets.
      </p>

      {/* Group badges */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Asset Groups
        </label>
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <button
              key={g.name}
              onClick={() => setSelectedGroup(selectedGroup === g.name ? null : g.name)}
              className={`relative group flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                selectedGroup === g.name
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/50 text-foreground border-border hover:border-primary/50'
              }`}
            >
              {g.name}
              <span className="text-[10px] opacity-70 ml-0.5">({g.types.length})</span>
              <button
                onClick={e => { e.stopPropagation(); removeGroup(g.name); }}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>

        {/* Add group */}
        <div className="flex gap-2 mt-3">
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addGroup()}
            placeholder="New group name…"
            className="flex-1 h-9 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addGroup}
            disabled={!newGroupName.trim()}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Asset types for selected group */}
      {activeGroup && (
        <div className="border border-border rounded-xl p-4 bg-card">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Asset Types in "{activeGroup.name}"
          </label>

          {activeGroup.types.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No asset types yet. Add one below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {activeGroup.types.map(t => (
                <span
                  key={t}
                  className="group flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium border border-border"
                >
                  {t}
                  <button
                    onClick={() => removeType(activeGroup.name, t)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newTypeName}
              onChange={e => setNewTypeName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addType()}
              placeholder={`Add type to ${activeGroup.name}…`}
              className="flex-1 h-9 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addType}
              disabled={!newTypeName.trim()}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
