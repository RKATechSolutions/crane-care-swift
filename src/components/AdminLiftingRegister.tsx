import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Save, Loader2, Link2, Trash2 } from 'lucide-react';

interface CategoryGroup {
  name: string;
  description: string;
  types: string[];
  fields: string[]; // which extra fields this group shows
}

interface LiftingRegisterConfig {
  equipment_types: string[];
  category_groups: CategoryGroup[];
  // Legacy keys kept for backward compat
  sling_types: string[];
  hoist_types: string[];
  beam_types: string[];
  sling_configurations: string[];
  equipment_statuses: string[];
  wll_units: string[];
  tag_present_options: { value: string; label: string }[];
}

const FIELD_OPTIONS = [
  { value: 'sling_configuration', label: 'Sling Configuration' },
  { value: 'sling_leg_count', label: 'Leg Count' },
  { value: 'length_m', label: 'Length (m)' },
  { value: 'lift_height_m', label: 'Lift Height (m)' },
  { value: 'span_m', label: 'Span (m)' },
  { value: 'grade', label: 'Grade' },
];

const DEFAULT_GROUPS: CategoryGroup[] = [
  { name: 'Sling Types', description: 'Sling-specific fields (config, legs, length)', types: ['Chain Sling', 'Wire Rope Sling', 'Web Sling'], fields: ['sling_configuration', 'sling_leg_count', 'length_m'] },
  { name: 'Hoist Types', description: 'Hoist-specific fields (lift height)', types: ['Lever Hoist', 'Chain Block'], fields: ['lift_height_m'] },
  { name: 'Beam Types', description: 'Beam-specific fields (span)', types: ['Beam Clamp', 'Spreader Beam'], fields: ['span_m'] },
];

const DEFAULT_CONFIG: LiftingRegisterConfig = {
  equipment_types: [
    'Chain Sling', 'Wire Rope Sling', 'Web Sling', 'Shackle', 'Hook',
    'Lever Hoist', 'Chain Block', 'Beam Clamp', 'Spreader Beam',
    'Lifting Lug', 'Eyebolt', 'Swivel',
  ],
  category_groups: DEFAULT_GROUPS,
  sling_types: ['Chain Sling', 'Wire Rope Sling', 'Web Sling'],
  hoist_types: ['Lever Hoist', 'Chain Block'],
  beam_types: ['Beam Clamp', 'Spreader Beam'],
  sling_configurations: ['Single Leg', 'Two Leg', 'Three Leg', 'Four Leg', 'Endless'],
  equipment_statuses: ['In Service', 'Failed', 'Removed From Service', 'Pending Inspection'],
  wll_units: ['kg', 't'],
  tag_present_options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
    { value: 'illegible', label: 'Illegible' },
    { value: 'unknown', label: 'Unknown' },
  ],
};

type ListKey = 'equipment_types' | 'sling_configurations' | 'equipment_statuses' | 'wll_units';

interface ListEditorProps {
  title: string;
  description: string;
  configKey: ListKey;
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function ListEditor({ title, description, items, inputValue, onInputChange, onAdd, onRemove }: ListEditorProps) {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <Badge key={`${item}-${idx}`} variant="secondary" className="text-xs gap-1 pr-1">
            {item}
            <button type="button" onClick={() => onRemove(idx)} className="ml-0.5 hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          placeholder="Add new..."
          className="text-sm"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        />
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

interface CategoryGroupEditorProps {
  group: CategoryGroup;
  index: number;
  equipmentTypes: string[];
  onUpdate: (index: number, group: CategoryGroup) => void;
  onDelete: (index: number) => void;
}

function CategoryGroupEditor({ group, index, equipmentTypes, onUpdate, onDelete }: CategoryGroupEditorProps) {
  const toggleType = (type: string) => {
    const types = group.types.includes(type)
      ? group.types.filter(t => t !== type)
      : [...group.types, type];
    onUpdate(index, { ...group, types });
  };

  const toggleField = (field: string) => {
    const fields = group.fields.includes(field)
      ? group.fields.filter(f => f !== field)
      : [...group.fields, field];
    onUpdate(index, { ...group, fields });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={group.name}
              onChange={e => onUpdate(index, { ...group, name: e.target.value })}
              className="text-sm font-bold h-8 px-2"
              placeholder="Group name..."
            />
          </div>
          <Input
            value={group.description}
            onChange={e => onUpdate(index, { ...group, description: e.target.value })}
            className="text-xs h-7 px-2 text-muted-foreground"
            placeholder="Description..."
          />
        </div>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => onDelete(index)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Equipment type toggles */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Equipment Types in this group:</p>
        <div className="flex flex-wrap gap-1.5">
          {equipmentTypes.map(type => {
            const active = group.types.includes(type);
            return (
              <Badge
                key={type}
                variant={active ? 'default' : 'outline'}
                className={`text-xs cursor-pointer transition-colors ${active ? '' : 'opacity-50'}`}
                onClick={() => toggleType(type)}
              >
                {type}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Field toggles */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Extra fields shown for this group:</p>
        <div className="flex flex-wrap gap-1.5">
          {FIELD_OPTIONS.map(opt => {
            const active = group.fields.includes(opt.value);
            return (
              <Badge
                key={opt.value}
                variant={active ? 'default' : 'outline'}
                className={`text-xs cursor-pointer transition-colors ${active ? 'bg-primary/80' : 'opacity-50'}`}
                onClick={() => toggleField(opt.value)}
              >
                {opt.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function AdminLiftingRegister() {
  const [config, setConfig] = useState<LiftingRegisterConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<ListKey, string>>({
    equipment_types: '',
    sling_configurations: '',
    equipment_statuses: '',
    wll_units: '',
  });

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase.from('admin_config').select('config').eq('id', 'lifting_register').maybeSingle();
      if (data?.config) {
        const saved = data.config as any;
        // Migrate legacy config to category_groups if needed
        if (!saved.category_groups && (saved.sling_types || saved.hoist_types || saved.beam_types)) {
          saved.category_groups = [
            { name: 'Sling Types', description: 'Sling-specific fields', types: saved.sling_types || [], fields: ['sling_configuration', 'sling_leg_count', 'length_m'] },
            { name: 'Hoist Types', description: 'Hoist-specific fields', types: saved.hoist_types || [], fields: ['lift_height_m'] },
            { name: 'Beam Types', description: 'Beam-specific fields', types: saved.beam_types || [], fields: ['span_m'] },
          ];
        }
        setConfig({ ...DEFAULT_CONFIG, ...saved });
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sync legacy keys from category_groups for backward compat
      const groups = config.category_groups || [];
      const slingGroup = groups.find(g => g.name.toLowerCase().includes('sling'));
      const hoistGroup = groups.find(g => g.name.toLowerCase().includes('hoist'));
      const beamGroup = groups.find(g => g.name.toLowerCase().includes('beam'));

      const saveConfig = {
        ...config,
        sling_types: slingGroup?.types || [],
        hoist_types: hoistGroup?.types || [],
        beam_types: beamGroup?.types || [],
      };

      const { error } = await supabase
        .from('admin_config')
        .upsert([{ id: 'lifting_register', config: saveConfig as any, updated_at: new Date().toISOString() }]);
      if (error) throw error;
      toast.success('Lifting register config saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (key: ListKey) => {
    const val = newItems[key].trim();
    if (!val) return;
    if (config[key].includes(val)) { toast.error('Already exists'); return; }
    setConfig(prev => ({ ...prev, [key]: [...prev[key], val] }));
    setNewItems(prev => ({ ...prev, [key]: '' }));
  };

  const removeItem = (key: ListKey, idx: number) => {
    setConfig(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const updateGroup = (idx: number, group: CategoryGroup) => {
    setConfig(prev => ({
      ...prev,
      category_groups: prev.category_groups.map((g, i) => i === idx ? group : g),
    }));
  };

  const deleteGroup = (idx: number) => {
    setConfig(prev => ({
      ...prev,
      category_groups: prev.category_groups.filter((_, i) => i !== idx),
    }));
  };

  const addGroup = () => {
    setConfig(prev => ({
      ...prev,
      category_groups: [...prev.category_groups, { name: 'New Group', description: 'Which equipment types belong here', types: [], fields: [] }],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h2 className="font-bold text-base">Lifting Register Fields</h2>
        <p className="text-xs text-muted-foreground">Configure dropdown options used when registering lifting equipment</p>
      </div>

      <ListEditor
        title="Equipment Types"
        description="Types available in the equipment type dropdown"
        configKey="equipment_types"
        items={config.equipment_types}
        inputValue={newItems.equipment_types}
        onInputChange={value => setNewItems(prev => ({ ...prev, equipment_types: value }))}
        onAdd={() => addItem('equipment_types')}
        onRemove={idx => removeItem('equipment_types', idx)}
      />

      {/* Category Groups */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Category Groups</h3>
            <p className="text-xs text-muted-foreground">Map equipment types to groups that control which extra fields appear</p>
          </div>
          <Button size="sm" variant="outline" onClick={addGroup}>
            <Plus className="w-4 h-4 mr-1" /> Add Group
          </Button>
        </div>

        {config.category_groups.map((group, idx) => (
          <CategoryGroupEditor
            key={idx}
            group={group}
            index={idx}
            equipmentTypes={config.equipment_types}
            onUpdate={updateGroup}
            onDelete={deleteGroup}
          />
        ))}
      </div>

      <ListEditor
        title="Sling Configurations"
        description="Options for sling configuration dropdown"
        configKey="sling_configurations"
        items={config.sling_configurations}
        inputValue={newItems.sling_configurations}
        onInputChange={value => setNewItems(prev => ({ ...prev, sling_configurations: value }))}
        onAdd={() => addItem('sling_configurations')}
        onRemove={idx => removeItem('sling_configurations', idx)}
      />

      <ListEditor
        title="Equipment Statuses"
        description="Options for equipment status dropdown"
        configKey="equipment_statuses"
        items={config.equipment_statuses}
        inputValue={newItems.equipment_statuses}
        onInputChange={value => setNewItems(prev => ({ ...prev, equipment_statuses: value }))}
        onAdd={() => addItem('equipment_statuses')}
        onRemove={idx => removeItem('equipment_statuses', idx)}
      />

      <ListEditor
        title="WLL Units"
        description="Weight unit options for Working Load Limit"
        configKey="wll_units"
        items={config.wll_units}
        inputValue={newItems.wll_units}
        onInputChange={value => setNewItems(prev => ({ ...prev, wll_units: value }))}
        onAdd={() => addItem('wll_units')}
        onRemove={idx => removeItem('wll_units', idx)}
      />

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border">
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
