import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  AdminFormConfig, CustomField, FieldVisibility,
} from '@/types/adminConfig';
import {
  Eye, EyeOff, Plus, Trash2, ChevronRight, ArrowLeft,
  FileText, Lock, Package, ClipboardList,
} from 'lucide-react';

type Section = 'menu' | 'report_fields' | 'report_custom' | 'private_inspection' | 'private_asset' | 'asset_add' | 'asset_detail';

export default function AdminCustomisation() {
  const { state, dispatch } = useApp();
  const config = state.adminConfig;
  const [section, setSection] = useState<Section>('menu');

  // New custom field form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomField['type']>('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);

  const updateConfig = (partial: Partial<AdminFormConfig>) => {
    dispatch({ type: 'UPDATE_ADMIN_CONFIG', payload: partial });
  };

  const toggleFieldVisibility = (
    key: 'reportCustomerFields' | 'assetAddFields' | 'assetDetailFields',
    fieldKey: string,
  ) => {
    const updated = config[key].map(f =>
      f.fieldKey === fieldKey ? { ...f, visible: !f.visible } : f
    );
    updateConfig({ [key]: updated });
  };

  const addCustomField = (
    key: 'reportCustomFields' | 'privateInspectionFields' | 'privateAssetFields',
  ) => {
    if (!newLabel.trim()) return;
    const field: CustomField = {
      id: `cf-${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      options: newType === 'select' ? newOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
      required: newRequired,
    };
    updateConfig({ [key]: [...config[key], field] });
    setNewLabel('');
    setNewType('text');
    setNewOptions('');
    setNewRequired(false);
  };

  const removeCustomField = (
    key: 'reportCustomFields' | 'privateInspectionFields' | 'privateAssetFields',
    fieldId: string,
  ) => {
    updateConfig({ [key]: config[key].filter(f => f.id !== fieldId) });
  };

  const renderFieldToggleList = (
    fields: FieldVisibility[],
    configKey: 'reportCustomerFields' | 'assetAddFields' | 'assetDetailFields',
  ) => (
    <div className="space-y-1">
      {fields.map(f => (
        <button
          key={f.fieldKey}
          onClick={() => toggleFieldVisibility(configKey, f.fieldKey)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
            f.visible ? 'bg-muted' : 'bg-muted/40 opacity-60'
          }`}
        >
          {f.visible
            ? <Eye className="w-4 h-4 text-rka-green flex-shrink-0" />
            : <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          }
          <span className="text-sm font-medium flex-1 text-left">{f.label}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            f.visible ? 'bg-rka-green/20 text-rka-green-dark' : 'bg-muted-foreground/20 text-muted-foreground'
          }`}>
            {f.visible ? 'Visible' : 'Hidden'}
          </span>
        </button>
      ))}
    </div>
  );

  const renderCustomFieldList = (
    fields: CustomField[],
    configKey: 'reportCustomFields' | 'privateInspectionFields' | 'privateAssetFields',
  ) => (
    <div className="space-y-3">
      {fields.map(f => (
        <div key={f.id} className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{f.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {f.type}{f.required ? ' • Required' : ''}{f.options ? ` • ${f.options.join(', ')}` : ''}
            </p>
          </div>
          <button
            onClick={() => removeCustomField(configKey, f.id)}
            className="p-1.5 text-muted-foreground active:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Add new field form */}
      <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-dashed border-border">
        <p className="text-xs font-bold text-muted-foreground">Add Custom Field</p>
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder="Field label"
          className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
        />
        <div className="flex gap-2">
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as CustomField['type'])}
            className="flex-1 p-2.5 border border-border rounded-lg bg-background text-sm"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Dropdown</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={e => setNewRequired(e.target.checked)}
              className="rounded"
            />
            Required
          </label>
        </div>
        {newType === 'select' && (
          <input
            type="text"
            value={newOptions}
            onChange={e => setNewOptions(e.target.value)}
            placeholder="Options (comma separated)"
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
          />
        )}
        <button
          onClick={() => addCustomField(configKey)}
          disabled={!newLabel.trim() || (newType === 'select' && !newOptions.trim())}
          className="w-full h-10 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>
    </div>
  );

  const BackButton = ({ label }: { label: string }) => (
    <button onClick={() => setSection('menu')} className="text-sm text-primary font-medium mb-3 flex items-center gap-1">
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );

  // ── Main menu ──
  if (section === 'menu') {
    const menuItems: { id: Section; icon: React.ReactNode; title: string; desc: string }[] = [
      { id: 'report_fields', icon: <FileText className="w-5 h-5" />, title: 'Report Customer Fields', desc: 'Toggle which customer details appear on report cover page' },
      { id: 'report_custom', icon: <Plus className="w-5 h-5" />, title: 'Custom Report Fields', desc: `Add custom fields for reports (${config.reportCustomFields.length} added)` },
      { id: 'private_inspection', icon: <Lock className="w-5 h-5" />, title: 'Private Inspection Fields', desc: `Internal-only fields on inspections (${config.privateInspectionFields.length} added)` },
      { id: 'private_asset', icon: <Lock className="w-5 h-5" />, title: 'Private Asset Fields', desc: `Internal-only fields on assets (${config.privateAssetFields.length} added)` },
      { id: 'asset_add', icon: <Package className="w-5 h-5" />, title: 'Add Asset Form', desc: 'Choose which fields appear when adding assets' },
      { id: 'asset_detail', icon: <ClipboardList className="w-5 h-5" />, title: 'Asset Detail View', desc: 'Choose which fields show in asset detail modal' },
    ];

    return (
      <div className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customise Forms & Fields</p>
        {menuItems.map(m => (
          <button
            key={m.id}
            onClick={() => setSection(m.id)}
            className="w-full bg-muted rounded-xl p-4 text-left active:bg-foreground/10 transition-colors flex items-center gap-3"
          >
            <div className="p-2 bg-primary/10 rounded-lg text-primary">{m.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    );
  }

  // ── Report customer fields ──
  if (section === 'report_fields') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Report Customer Fields</p>
        <p className="text-xs text-muted-foreground">Toggle which customer details appear on the report front page.</p>
        {renderFieldToggleList(config.reportCustomerFields, 'reportCustomerFields')}
      </div>
    );
  }

  // ── Custom report fields ──
  if (section === 'report_custom') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Custom Report Fields</p>
        <p className="text-xs text-muted-foreground">Add extra fields that appear on report cover pages (e.g. Purchase Order #, Site Manager).</p>
        {renderCustomFieldList(config.reportCustomFields, 'reportCustomFields')}
      </div>
    );
  }

  // ── Private inspection fields ──
  if (section === 'private_inspection') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Private Inspection Fields</p>
        <p className="text-xs text-muted-foreground">These fields appear on inspections but are <strong>never included</strong> in customer reports.</p>
        {renderCustomFieldList(config.privateInspectionFields, 'privateInspectionFields')}
      </div>
    );
  }

  // ── Private asset fields ──
  if (section === 'private_asset') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Private Asset Fields</p>
        <p className="text-xs text-muted-foreground">Internal-only fields visible on asset details but <strong>never on reports</strong>.</p>
        {renderCustomFieldList(config.privateAssetFields, 'privateAssetFields')}
      </div>
    );
  }

  // ── Asset add form fields ──
  if (section === 'asset_add') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Add Asset Form Fields</p>
        <p className="text-xs text-muted-foreground">Toggle which fields appear when adding a new asset.</p>
        {renderFieldToggleList(config.assetAddFields, 'assetAddFields')}
      </div>
    );
  }

  // ── Asset detail fields ──
  if (section === 'asset_detail') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Asset Detail View Fields</p>
        <p className="text-xs text-muted-foreground">Toggle which fields show in the asset detail modal.</p>
        {renderFieldToggleList(config.assetDetailFields, 'assetDetailFields')}
      </div>
    );
  }

  return null;
}
