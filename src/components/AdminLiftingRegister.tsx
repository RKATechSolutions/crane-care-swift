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
    'Chain Sling', 'Wire Rope Sling', 'Web Sling', 'Shackle', 'Hook',
    'Lever Hoist', 'Chain Block', 'Beam Clamp', 'Spreader Beam',
    'Lifting Lug', 'Eyebolt', 'Swivel',
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

export default function AdminLiftingRegister() {
  const [config, setConfig] = useState<LiftingRegisterConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('admin_config')
        .select('config')
        .eq('id', 'lifting_register')
        .single();

      if (data?.config) {
        setConfig({ ...DEFAULT_CONFIG, ...(data.config as any) });
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
      const { error } = await supabase
        .from('admin_config')
        .upsert({ id: 'lifting_register', config: config as any, updated_at: new Date().toISOString() });

      if (error) throw error;
      toast.success('Lifting register config saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (key: ListKey) => {
    const val = newItems[key]?.trim();
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

  const ListEditor = ({ title, description, configKey }: { title: string; description: string; configKey: ListKey }) => (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {config[configKey].map((item, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs gap-1 pr-1">
            {item}
            <button onClick={() => removeItem(configKey, idx)} className="ml-0.5 hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newItems[configKey] || ''}
          onChange={e => setNewItems(prev => ({ ...prev, [configKey]: e.target.value }))}
          placeholder="Add new..."
          className="text-sm"
          onKeyDown={e => e.key === 'Enter' && addItem(configKey)}
        />
        <Button size="sm" variant="outline" onClick={() => addItem(configKey)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );

  const CategoryMapper = ({ title, description, catKey }: { title: string; description: string; catKey: CategoryKey }) => (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {config.equipment_types.map(type => {
          const active = config[catKey].includes(type);
          return (
            <Badge
              key={type}
              variant={active ? 'default' : 'outline'}
              className={`text-xs cursor-pointer transition-colors ${active ? '' : 'opacity-50'}`}
              onClick={() => toggleCategory(catKey, type)}
            >
              {type}
            </Badge>
          );
        })}
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base">Lifting Register Fields</h2>
          <p className="text-xs text-muted-foreground">Configure dropdown options used when registering lifting equipment</p>
        </div>
      </div>

      <ListEditor
        title="Equipment Types"
        description="Types available in the equipment type dropdown"
        configKey="equipment_types"
      />

      <CategoryMapper
        title="Sling Types"
        description="Which equipment types show sling-specific fields (config, legs, length)"
        catKey="sling_types"
      />

      <CategoryMapper
        title="Hoist Types"
        description="Which equipment types show hoist-specific fields (lift height)"
        catKey="hoist_types"
      />

      <CategoryMapper
        title="Beam Types"
        description="Which equipment types show beam-specific fields (span)"
        catKey="beam_types"
      />

      <ListEditor
        title="Sling Configurations"
        description="Options for sling configuration dropdown"
        configKey="sling_configurations"
      />

      <ListEditor
        title="Equipment Statuses"
        description="Options for equipment status dropdown"
        configKey="equipment_statuses"
      />

      <ListEditor
        title="WLL Units"
        description="Weight unit options for Working Load Limit"
        configKey="wll_units"
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
