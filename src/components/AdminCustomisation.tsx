import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  AdminFormConfig, CustomField, FieldVisibility, ClientInfoField, JobSummarySectionVisibility,
} from '@/types/adminConfig';
import {
  Eye, EyeOff, Plus, Trash2, ChevronRight, ArrowLeft,
  FileText, Lock, Package, ClipboardList, Users, GripVertical,
  Pencil, Check, ArrowUp, ArrowDown, ToggleLeft, ToggleRight,
} from 'lucide-react';

type Section = 'menu' | 'report_fields' | 'report_custom' | 'private_inspection' | 'private_asset' | 'asset_add' | 'asset_detail' | 'client_info' | 'job_summary_sections';

export default function AdminCustomisation() {
  const { state, dispatch } = useApp();
  const config = state.adminConfig;
  const [section, setSection] = useState<Section>('menu');

  // New custom field form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomField['type']>('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);

  // Client info editing
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState<ClientInfoField['fieldType']>('text');
  const [editFieldGroup, setEditFieldGroup] = useState('Contact Details');
  const [editFieldOptions, setEditFieldOptions] = useState('');
  const [newClientLabel, setNewClientLabel] = useState('');
  const [newClientType, setNewClientType] = useState<ClientInfoField['fieldType']>('text');
  const [newClientGroup, setNewClientGroup] = useState('Contact Details');
  const [newClientOptions, setNewClientOptions] = useState('');

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

  // Client info field operations
  const clientFields = [...(config.clientInfoFields || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const clientGroups = [...new Set(clientFields.map(f => f.group))];

  const toggleClientFieldVisibility = (fieldKey: string) => {
    const updated = config.clientInfoFields.map(f =>
      f.fieldKey === fieldKey ? { ...f, visible: !f.visible } : f
    );
    updateConfig({ clientInfoFields: updated });
  };

  const toggleClientFieldEditable = (fieldKey: string) => {
    const updated = config.clientInfoFields.map(f =>
      f.fieldKey === fieldKey ? { ...f, editable: !f.editable } : f
    );
    updateConfig({ clientInfoFields: updated });
  };

  const startEditingClientField = (f: ClientInfoField) => {
    setEditingFieldKey(f.fieldKey);
    setEditLabel(f.label);
    setEditFieldType(f.fieldType || 'text');
    setEditFieldGroup(f.group);
    setEditFieldOptions(f.options?.join(', ') || '');
  };

  const saveClientFieldEdit = (fieldKey: string) => {
    if (!editLabel.trim()) return;
    const updated = config.clientInfoFields.map(f =>
      f.fieldKey === fieldKey ? {
        ...f,
        label: editLabel.trim(),
        fieldType: editFieldType,
        group: editFieldGroup,
        options: editFieldType === 'select' ? editFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : f.options,
      } : f
    );
    updateConfig({ clientInfoFields: updated });
    setEditingFieldKey(null);
    setEditLabel('');
  };

  const moveClientField = (fieldKey: string, direction: 'up' | 'down') => {
    const sorted = [...config.clientInfoFields].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(f => f.fieldKey === fieldKey);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tempOrder = sorted[idx].sortOrder;
    sorted[idx] = { ...sorted[idx], sortOrder: sorted[swapIdx].sortOrder };
    sorted[swapIdx] = { ...sorted[swapIdx], sortOrder: tempOrder };
    updateConfig({ clientInfoFields: sorted });
  };

  const removeClientField = (fieldKey: string) => {
    updateConfig({ clientInfoFields: config.clientInfoFields.filter(f => f.fieldKey !== fieldKey) });
  };

  const addClientInfoField = () => {
    if (!newClientLabel.trim()) return;
    const maxOrder = Math.max(...config.clientInfoFields.map(f => f.sortOrder), 0);
    const fieldKey = `custom_${Date.now()}`;
    const field: ClientInfoField = {
      fieldKey,
      label: newClientLabel.trim(),
      visible: true,
      editable: true,
      sortOrder: maxOrder + 1,
      group: newClientGroup,
      isCustom: true,
      fieldType: newClientType,
      options: newClientType === 'select' ? newClientOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
    };
    updateConfig({ clientInfoFields: [...config.clientInfoFields, field] });
    setNewClientLabel('');
    setNewClientType('text');
    setNewClientOptions('');
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
    const jobSummarySections = config.jobSummarySections || [];
    const menuItems: { id: Section; icon: React.ReactNode; title: string; desc: string }[] = [
      { id: 'job_summary_sections', icon: <ClipboardList className="w-5 h-5" />, title: 'Job Summary Sections', desc: `Show/hide sections on Job Site Summary (${jobSummarySections.filter(s => s.visible).length}/${jobSummarySections.length} visible)` },
      { id: 'client_info', icon: <Users className="w-5 h-5" />, title: 'Client Info (Job Summary)', desc: `Configure fields techs see & edit on-site (${clientFields.filter(f => f.visible).length} visible)` },
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

  // ── Client Info Fields (Job Summary) ──
  if (section === 'client_info') {
    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Client Info — Site Job Summary</p>
        <p className="text-xs text-muted-foreground">
          Configure which client fields technicians see and can edit on the Site Job Summary. Drag to reorder, rename labels, or add new custom fields.
        </p>

        <div className="flex gap-2 text-[10px] text-muted-foreground items-center flex-wrap">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-rka-green" /> Visible</span>
          <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Hidden</span>
          <span className="flex items-center gap-1"><Pencil className="w-3 h-3 text-primary" /> Editable by tech</span>
        </div>

        {clientGroups.map(group => {
          const groupFields = clientFields.filter(f => f.group === group);
          return (
            <div key={group}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">{group}</p>
              <div className="space-y-1">
                {groupFields.map((f, idx) => (
                  <div key={f.fieldKey} className="space-y-0">
                    <div
                      className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors ${
                        f.visible ? 'bg-muted' : 'bg-muted/40 opacity-60'
                      }`}
                    >
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveClientField(f.fieldKey, 'up')} className="p-0.5 text-muted-foreground hover:text-foreground" disabled={idx === 0}>
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => moveClientField(f.fieldKey, 'down')} className="p-0.5 text-muted-foreground hover:text-foreground" disabled={idx === groupFields.length - 1}>
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Visibility toggle */}
                      <button onClick={() => toggleClientFieldVisibility(f.fieldKey)} className="flex-shrink-0">
                        {f.visible ? <Eye className="w-4 h-4 text-rka-green" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </button>

                      {/* Label + info */}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => startEditingClientField(f)}
                          className="text-sm font-medium text-left w-full truncate flex items-center gap-1"
                        >
                          {f.label}
                          <Pencil className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                        </button>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          <span className="text-[10px] bg-background px-1.5 py-0.5 rounded font-medium">{f.fieldType || 'text'}</span>
                          {f.isCustom && <span className="text-[10px] text-primary font-medium">Custom</span>}
                          {f.options && f.options.length > 0 && <span className="text-[10px] text-muted-foreground">{f.options.join(', ')}</span>}
                        </div>
                      </div>

                      {/* Editable toggle */}
                      <button
                        onClick={() => toggleClientFieldEditable(f.fieldKey)}
                        className={`flex-shrink-0 p-1 rounded ${f.editable ? 'text-primary' : 'text-muted-foreground/40'}`}
                        title={f.editable ? 'Editable by tech' : 'Read-only for tech'}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete (custom only) */}
                      {f.isCustom && (
                        <button onClick={() => removeClientField(f.fieldKey)} className="p-1 text-muted-foreground active:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Inline edit panel */}
                    {editingFieldKey === f.fieldKey && (
                      <div className="bg-muted rounded-b-xl p-3 space-y-2 border-2 border-primary/20 -mt-1">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground">Label</label>
                          <input
                            type="text"
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground">Field Type</label>
                            <select
                              value={editFieldType || 'text'}
                              onChange={e => setEditFieldType(e.target.value as ClientInfoField['fieldType'])}
                              className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Multi-line Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="select">Dropdown</option>
                              <option value="checkbox">Checkbox (Yes/No)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground">Group</label>
                            <select
                              value={editFieldGroup}
                              onChange={e => setEditFieldGroup(e.target.value)}
                              className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm"
                            >
                              <option value="Contact Details">Contact Details</option>
                              <option value="Service & Scheduling">Service & Scheduling</option>
                              <option value="Business Info">Business Info</option>
                              <option value="Links">Links</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>
                        </div>
                        {editFieldType === 'select' && (
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground">Options (comma separated)</label>
                            <input
                              type="text"
                              value={editFieldOptions}
                              onChange={e => setEditFieldOptions(e.target.value)}
                              placeholder="e.g. Yes, No, N/A"
                              className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveClientFieldEdit(f.fieldKey)}
                            disabled={!editLabel.trim()}
                            className="flex-1 h-8 bg-primary text-primary-foreground rounded-lg font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-40"
                          >
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingFieldKey(null)}
                            className="px-3 h-8 bg-muted rounded-lg font-semibold text-xs border border-border"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add new custom client info field */}
        <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-dashed border-border mt-4">
          <p className="text-xs font-bold text-muted-foreground">Add Custom Client Field</p>
          <input
            type="text"
            value={newClientLabel}
            onChange={e => setNewClientLabel(e.target.value)}
            placeholder="Field label (e.g. Purchase Order #)"
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newClientType}
              onChange={e => setNewClientType(e.target.value as ClientInfoField['fieldType'])}
              className="flex-1 p-2.5 border border-border rounded-lg bg-background text-sm"
            >
              <option value="text">Text</option>
              <option value="textarea">Multi-line Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Dropdown</option>
              <option value="checkbox">Checkbox (Yes/No)</option>
            </select>
            <select
              value={newClientGroup}
              onChange={e => setNewClientGroup(e.target.value)}
              className="flex-1 p-2.5 border border-border rounded-lg bg-background text-sm"
            >
              <option value="Contact Details">Contact Details</option>
              <option value="Service & Scheduling">Service & Scheduling</option>
              <option value="Business Info">Business Info</option>
              <option value="Links">Links</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          {newClientType === 'select' && (
            <input
              type="text"
              value={newClientOptions}
              onChange={e => setNewClientOptions(e.target.value)}
              placeholder="Options (comma separated)"
              className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
            />
          )}
          <button
            onClick={addClientInfoField}
            disabled={!newClientLabel.trim() || (newClientType === 'select' && !newClientOptions.trim())}
            className="w-full h-10 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Add Client Field
          </button>
        </div>
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

  // ── Job Summary Sections ──
  if (section === 'job_summary_sections') {
    const sections = config.jobSummarySections || [];
    const groups = [...new Set(sections.map(s => s.group))];

    const toggleSection = (fieldKey: string) => {
      const updated = sections.map(s =>
        s.fieldKey === fieldKey ? { ...s, visible: !s.visible } : s
      );
      updateConfig({ jobSummarySections: updated });
    };

    return (
      <div className="p-4 space-y-3">
        <BackButton label="Back to Customisation" />
        <p className="font-bold text-base">Job Site Summary — Sections</p>
        <p className="text-xs text-muted-foreground">
          Toggle which sections and fields appear on the Job Site Summary page for technicians.
        </p>

        {groups.map(group => {
          const groupItems = sections.filter(s => s.group === group);
          return (
            <div key={group}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">{group}</p>
              <div className="space-y-1 mb-3">
                {groupItems.map(s => (
                  <button
                    key={s.fieldKey}
                    onClick={() => toggleSection(s.fieldKey)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      s.visible ? 'bg-muted' : 'bg-muted/40 opacity-60'
                    }`}
                  >
                    {s.visible
                      ? <Eye className="w-4 h-4 text-rka-green flex-shrink-0" />
                      : <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                    <span className="text-sm font-medium flex-1 text-left">{s.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.visible ? 'bg-rka-green/20 text-rka-green-dark' : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {s.visible ? 'Visible' : 'Hidden'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
