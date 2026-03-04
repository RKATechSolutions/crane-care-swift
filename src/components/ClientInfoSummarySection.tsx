import { useState } from 'react';
import { Building2, Pencil, Save, ExternalLink } from 'lucide-react';
import { AdminFormConfig, ClientInfoField } from '@/types/adminConfig';

interface Props {
  clientInfo: any;
  clientContacts: any[];
  adminConfig: AdminFormConfig;
  onUpdateClientInfo: (updates: Record<string, any>) => void;
}

export function ClientInfoSummarySection({ clientInfo, clientContacts, adminConfig, onUpdateClientInfo }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const fields = [...(adminConfig.clientInfoFields || [])]
    .filter(f => f.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const groups = [...new Set(fields.map(f => f.group))];
  const editableFieldCount = fields.filter(f => f.editable).length;

  const getFieldValue = (field: ClientInfoField) => {
    if (field.isCustom || field.fieldKey.startsWith('custom_')) {
      return clientInfo?.client_custom_fields?.[field.fieldKey] ?? '';
    }
    return clientInfo?.[field.fieldKey] ?? '';
  };

  const startEditing = () => {
    if (editableFieldCount === 0) return;
    const d: Record<string, string> = {};
    fields.forEach(f => {
      d[f.fieldKey] = String(getFieldValue(f) || '');
    });
    setDraft(d);
    setEditing(true);
  };

  const isLink = (v: string) => v?.startsWith('http');
    const standardUpdates: Record<string, any> = {};
    const customFieldUpdates: Record<string, any> = {};

    fields.filter(f => f.editable).forEach(f => {
      const value = draft[f.fieldKey]?.trim() || null;
      if (f.isCustom || f.fieldKey.startsWith('custom_')) {
        customFieldUpdates[f.fieldKey] = value;
      } else {
        standardUpdates[f.fieldKey] = value;
      }
    });

    onUpdateClientInfo({
      ...standardUpdates,
      __custom_fields: customFieldUpdates,
    });
    setEditing(false);
  };

  return (
    <div className="border border-primary/20 rounded-xl p-3 bg-primary/5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <label className="text-xs font-semibold text-primary uppercase tracking-wide">Client Information</label>
        </div>
        <button
          onClick={editing ? handleSave : startEditing}
          disabled={!editing && editableFieldCount === 0}
          className="flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-lg bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {editing ? <><Save className="w-3 h-3" /> Save</> : <><Pencil className="w-3 h-3" /> Edit</>}
        </button>
      </div>

      {groups.map(group => {
        const groupFields = fields.filter(f => f.group === group);
        if (groupFields.length === 0) return null;

        // Check if group has any non-empty values (skip empty groups in view mode)
        const hasValues = groupFields.some(f => clientInfo?.[f.fieldKey]);
        if (!editing && !hasValues) return null;

        return (
          <div key={group}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-2 mb-1">{group}</p>
            <div className="space-y-1">
              {groupFields.map(f => {
                const val = editing ? (draft[f.fieldKey] || '') : String(getFieldValue(f) || '');
                if (!editing && !val) return null;

                // Special highlight for site induction
                if (f.fieldKey === 'site_induction_details' && val && !editing) {
                  return (
                    <div key={f.fieldKey} className="p-2 rounded-lg bg-rka-orange-light">
                      <label className="text-xs font-semibold text-rka-orange uppercase tracking-wide">⚠️ {f.label}</label>
                      <p className="text-sm font-medium mt-0.5">{val}</p>
                    </div>
                  );
                }

                return (
                  <div key={f.fieldKey}>
                    <label className="text-[11px] font-medium text-muted-foreground">{f.label}</label>
                    {editing && f.editable ? (
                      f.fieldType === 'textarea' ? (
                        <textarea
                          value={draft[f.fieldKey] || ''}
                          onChange={e => setDraft(prev => ({ ...prev, [f.fieldKey]: e.target.value }))}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-border rounded-md bg-background text-sm resize-none"
                        />
                      ) : f.fieldType === 'select' && f.options ? (
                        <select
                          value={draft[f.fieldKey] || ''}
                          onChange={e => setDraft(prev => ({ ...prev, [f.fieldKey]: e.target.value }))}
                          className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm"
                        >
                          <option value="">Select...</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.fieldType === 'number' ? 'number' : f.fieldType === 'date' ? 'date' : 'text'}
                          value={draft[f.fieldKey] || ''}
                          onChange={e => setDraft(prev => ({ ...prev, [f.fieldKey]: e.target.value }))}
                          className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm"
                        />
                      )
                    ) : (
                      <div className="text-sm min-h-[20px]">
                        {isLink(val) ? (
                          <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 truncate">
                            {val.replace(/https?:\/\//, '').slice(0, 40)}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="font-medium">{val}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Other contacts */}
      {clientContacts.length > 0 && (
        <div className="mt-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Other Contacts</p>
          <div className="space-y-1 mt-1">
            {clientContacts.slice(0, 3).map((c, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.contact_name}</span>
                {c.contact_position && <span className="ml-1">({c.contact_position})</span>}
                {c.contact_email && <span className="ml-1">• {c.contact_email}</span>}
              </div>
            ))}
            {clientContacts.length > 3 && (
              <p className="text-xs text-muted-foreground">+{clientContacts.length - 3} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
