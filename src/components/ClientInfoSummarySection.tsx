import { useState } from 'react';
import { Building2, Pencil, Save, ExternalLink, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [draftContacts, setDraftContacts] = useState<any[]>([]);
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);

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
    if (editableFieldCount === 0 && clientContacts.length === 0) return;
    const d: Record<string, string> = {};
    fields.forEach(f => {
      d[f.fieldKey] = String(getFieldValue(f) || '');
    });
    setDraft(d);
    setDraftContacts([...clientContacts]);
    setDeletedContactIds([]);
    setEditing(true);
  };

  const handleSave = () => {
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
      __contacts: draftContacts,
      __deleted_contact_ids: deletedContactIds,
    });
    setEditing(false);
  };

  const updateContact = (index: number, updates: any) => {
    setDraftContacts(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const deleteContact = (index: number) => {
    const contact = draftContacts[index];
    if (contact.id) {
      setDeletedContactIds(prev => [...prev, contact.id]);
    }
    setDraftContacts(prev => prev.filter((_, i) => i !== index));
  };

  const makeMain = (index: number) => {
    const contact = draftContacts[index];
    setDraft(prev => ({
      ...prev,
      primary_contact_name: contact.contact_name || '',
      primary_contact_email: contact.contact_email || '',
    }));
  };

  const isLink = (v: string) => v?.startsWith('http');

  return (
    <div className="border border-primary/20 rounded-xl p-3 bg-primary/5 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <label className="text-xs font-semibold text-primary uppercase tracking-wide">Client Information</label>
        </div>
        <button
          onClick={editing ? handleSave : startEditing}
          disabled={!editing && editableFieldCount === 0 && clientContacts.length === 0}
          className="flex items-center gap-1 text-xs font-medium text-primary px-2 py-1 rounded-lg bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {editing ? <><Save className="w-3 h-3" /> Save</> : <><Pencil className="w-3 h-3" /> Edit</>}
        </button>
      </div>

      {groups.map(group => {
        const groupFields = fields.filter(f => f.group === group);
        if (groupFields.length === 0) return null;

        // Check if group has any non-empty values (skip empty groups in view mode)
        const hasValues = groupFields.some(f => String(getFieldValue(f) || '').trim().length > 0);
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
                    <div key={f.fieldKey} className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <label className="text-xs font-semibold text-primary uppercase tracking-wide">{f.label}</label>
                      <p className="text-sm font-medium mt-0.5 whitespace-pre-wrap">{val}</p>
                    </div>
                  );
                }

                return (
                  <div key={f.fieldKey}>
                    <label className="text-[11px] font-medium text-muted-foreground">{f.label}</label>
                    {editing && f.editable ? (
                      f.fieldType === 'checkbox' ? (
                        <div className="flex items-center gap-2 py-1">
                          <Checkbox
                            checked={draft[f.fieldKey] === 'Yes'}
                            onCheckedChange={(checked) => setDraft(prev => ({ ...prev, [f.fieldKey]: checked ? 'Yes' : 'No' }))}
                          />
                          <span className="text-sm">{draft[f.fieldKey] === 'Yes' ? 'Yes' : 'No'}</span>
                        </div>
                      ) : f.fieldType === 'textarea' ? (
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
                        {f.fieldType === 'checkbox' ? (
                          <div className="flex items-center gap-2">
                            <Checkbox checked={val === 'Yes'} disabled />
                            <span className="font-medium">{val === 'Yes' ? 'Yes' : 'No'}</span>
                          </div>
                        ) : isLink(val) ? (
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
      {(editing ? draftContacts : clientContacts).length > 0 && (
        <div className="mt-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Other Contacts</p>
          <div className="space-y-2 mt-1">
            {(editing ? draftContacts : clientContacts).map((c, i) => (
              editing ? (
                <div key={i} className="p-2 border border-border/50 rounded-lg space-y-1.5 bg-background/50 relative group">
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Name"
                      value={c.contact_name || ''}
                      onChange={e => updateContact(i, { contact_name: e.target.value })}
                      className="flex-1 h-7 px-2 border border-border rounded bg-background text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/5">
                        <Checkbox 
                          id={`main-contact-${i}`}
                          checked={c.contact_name === draft.primary_contact_name && c.contact_email === draft.primary_contact_email} 
                          onCheckedChange={() => makeMain(i)} 
                        />
                        <label htmlFor={`main-contact-${i}`} className="text-[10px] font-bold text-primary uppercase cursor-pointer">Main</label>
                      </div>

                      <button
                        onClick={() => deleteContact(i)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Position"
                      value={c.contact_position || ''}
                      onChange={e => updateContact(i, { contact_position: e.target.value })}
                      className="flex-1 h-7 px-2 border border-border rounded bg-background text-[10px]"
                    />
                    <input
                      placeholder="Email"
                      value={c.contact_email || ''}
                      onChange={e => updateContact(i, { contact_email: e.target.value })}
                      className="flex-1 h-7 px-2 border border-border rounded bg-background text-[10px]"
                    />
                  </div>
                </div>
              ) : (
                <div key={i} className="text-xs text-muted-foreground flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{c.contact_name}</span>
                    <span className="text-[10px] ml-1">
                      {c.contact_name === clientInfo.primary_contact_name && (
                        <span className="text-primary font-bold uppercase">(Main)</span>
                      )}
                      {c.contact_position && <span className="text-muted-foreground"> ({c.contact_position})</span>}
                    </span>
                    {c.contact_email && <span className="ml-1 text-muted-foreground">• {c.contact_email}</span>}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
