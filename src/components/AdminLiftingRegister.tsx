import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Save, Loader2, Link2 } from 'lucide-react';

interface LiftingRegisterConfig {
  equipment_types: string[];
  sling_types: string[];
  hoist_types: string[];
  beam_types: string[];
  sling_configurations: string[];
  equipment_statuses: string[];
  wll_units: string[];
  tag_present_options: { value: string; label: string }[];
}

const DEFAULT_CONFIG: LiftingRegisterConfig = {
  equipment_types: [
    'Chain Sling',
    'Wire Rope Sling',
    'Web Sling',
    'Shackle',
    'Hook',
    'Lever Hoist',
    'Chain Block',
    'Beam Clamp',
    'Spreader Beam',
    'Lifting Lug',
    'Eyebolt',
    'Swivel',
  ],
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
type CategoryKey = 'sling_types' | 'hoist_types' | 'beam_types';

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

function ListEditor({
  title,
  description,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: ListEditorProps) {
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
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

interface CategoryMapperProps {
  title: string;
  description: string;
  equipmentTypes: string[];
  activeTypes: string[];
  onToggle: (type: string) => void;
}

function CategoryMapper({ title, description, equipmentTypes, activeTypes, onToggle }: CategoryMapperProps) {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {equipmentTypes.map(type => {
          const active = activeTypes.includes(type);
          return (
            <Badge
              key={type}
              variant={active ? 'default' : 'outline'}
              className={`text-xs cursor-pointer transition-colors ${active ? '' : 'opacity-50'}`}
              onClick={() => onToggle(type)}
            >
              {type}
            </Badge>
          );
        })}
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

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase.from('admin_config').select('config').eq('id', 'lifting_register').maybeSingle();
      if (data?.config) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.config as object) });
      }
    } catch {
      // Use defaults if row doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_config')
        .upsert([{ id: 'lifting_register', config: config as any, updated_at: new Date().toISOString() }]);

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
    if (config[key].includes(val)) {
      toast.error('Already exists');
      return;
    }

    setConfig(prev => ({ ...prev, [key]: [...prev[key], val] }));
    setNewItems(prev => ({ ...prev, [key]: '' }));
  };

  const removeItem = (key: ListKey, idx: number) => {
    setConfig(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const toggleCategory = (catKey: CategoryKey, type: string) => {
    setConfig(prev => {
      const arr = prev[catKey];
      if (arr.includes(type)) {
        return { ...prev, [catKey]: arr.filter(t => t !== type) };
      }
      return { ...prev, [catKey]: [...arr, type] };
    });
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

      <CategoryMapper
        title="Sling Types"
        description="Which equipment types show sling-specific fields (config, legs, length)"
        equipmentTypes={config.equipment_types}
        activeTypes={config.sling_types}
        onToggle={type => toggleCategory('sling_types', type)}
      />

      <CategoryMapper
        title="Hoist Types"
        description="Which equipment types show hoist-specific fields (lift height)"
        equipmentTypes={config.equipment_types}
        activeTypes={config.hoist_types}
        onToggle={type => toggleCategory('hoist_types', type)}
      />

      <CategoryMapper
        title="Beam Types"
        description="Which equipment types show beam-specific fields (span)"
        equipmentTypes={config.equipment_types}
        activeTypes={config.beam_types}
        onToggle={type => toggleCategory('beam_types', type)}
      />

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
