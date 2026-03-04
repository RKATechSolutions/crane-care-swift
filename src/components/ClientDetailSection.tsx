import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, ExternalLink, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientData {
  id: string;
  client_name: string;
  location_address: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_mobile: string | null;
  primary_contact_position: string | null;
  primary_contact_given_name: string | null;
  primary_contact_surname: string | null;
  site_induction_details: string | null;
  send_schedule_reminders: string | null;
  abn: string | null;
  automatic_service_package: string | null;
  business_type: string | null;
  casual_service_rates: string | null;
  comments_or_notes: string | null;
  google_drive_link: string | null;
  inspectall_account_link: string | null;
  inspectall_code: string | null;
  lead_or_referral_source: string | null;
  payment_days: string | null;
  preferred_days_and_times: string | null;
  priority_service_package: string | null;
  required_to_complete_work: string | null;
  services_interested_in: string | null;
  travel_time_from_base: string | null;
  planned_service_dates: string | null;
  report_visible_fields: string[] | null;
}

const CUSTOM_FIELDS: { key: keyof ClientData; label: string; group: string }[] = [
  // Core contact fields
  { key: 'client_name', label: 'Client Name', group: 'Contact Details' },
  { key: 'location_address', label: 'Address', group: 'Contact Details' },
  { key: 'primary_contact_name', label: 'Primary Contact', group: 'Contact Details' },
  { key: 'primary_contact_email', label: 'Contact Email', group: 'Contact Details' },
  { key: 'primary_contact_mobile', label: 'Contact Mobile', group: 'Contact Details' },
  { key: 'primary_contact_position', label: 'Contact Position', group: 'Contact Details' },
  { key: 'abn', label: 'ABN', group: 'Contact Details' },
  { key: 'business_type', label: 'Business Type', group: 'Contact Details' },
  // Service fields
  { key: 'automatic_service_package', label: 'Automatic Service Package', group: 'Service & Scheduling' },
  { key: 'casual_service_rates', label: 'Casual Service Rates', group: 'Service & Scheduling' },
  { key: 'priority_service_package', label: 'Priority Service Package', group: 'Service & Scheduling' },
  { key: 'services_interested_in', label: 'Services Interested In', group: 'Service & Scheduling' },
  { key: 'preferred_days_and_times', label: 'Preferred Days & Times', group: 'Service & Scheduling' },
  { key: 'send_schedule_reminders', label: 'Send Schedule Reminders', group: 'Service & Scheduling' },
  { key: 'planned_service_dates', label: 'Planned Service Dates', group: 'Service & Scheduling' },
  { key: 'travel_time_from_base', label: 'Travel Time from Base', group: 'Service & Scheduling' },
  // Business fields
  { key: 'lead_or_referral_source', label: 'Lead / Referral Source', group: 'Business Info' },
  { key: 'payment_days', label: 'Payment Days', group: 'Business Info' },
  { key: 'required_to_complete_work', label: 'Required to Complete Work', group: 'Business Info' },
  { key: 'site_induction_details', label: 'Site Induction Details', group: 'Business Info' },
  { key: 'comments_or_notes', label: 'Comments / Notes', group: 'Business Info' },
  // Links
  { key: 'google_drive_link', label: 'Google Drive Link', group: 'External Links' },
  { key: 'inspectall_account_link', label: 'Inspectall Link', group: 'External Links' },
  { key: 'inspectall_code', label: 'Inspectall Code', group: 'External Links' },
];

const CHECKBOX_FIELDS = new Set<string>(['automatic_service_package', 'priority_service_package', 'send_schedule_reminders']);

const GROUPS = ['Contact Details', 'Service & Scheduling', 'Business Info', 'External Links'];

export function ClientDetailSection({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (data) {
        setClient(data as any);
        const d: Record<string, string> = {};
        CUSTOM_FIELDS.forEach(f => { d[f.key] = ((data as any)[f.key] as string) || ''; });
        setDraft(d);
        const rv = (data as any).report_visible_fields;
        setVisibleFields(new Set(Array.isArray(rv) ? rv : []));
      }
    };
    fetchClient();
  }, [clientId]);

  const toggleReportField = (key: string) => {
    setVisibleFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    const update: Record<string, any> = {};
    CUSTOM_FIELDS.forEach(f => { update[f.key] = draft[f.key] || null; });
    update.report_visible_fields = Array.from(visibleFields);
    const { error } = await supabase.from('clients').update(update).eq('id', client.id);
    if (error) toast.error(error.message);
    else { toast.success('Client details saved'); setEditing(false); setClient({ ...client, ...update } as any); }
    setSaving(false);
  };

  if (!client) {
    return <div className="p-8 text-center text-muted-foreground">Loading client details...</div>;
  }

  const isLink = (v: string) => v.startsWith('http');

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-4 py-3 space-y-4">
        {/* Edit / Save bar */}
        <div className="flex gap-2">
          <button
            onClick={() => { if (editing) { setEditing(false); } else { setEditing(true); } }}
            className="flex-1 h-9 bg-accent text-accent-foreground rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            {editing ? 'Cancel' : 'Edit Details'}
          </button>
          {editing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Eye className="w-3 h-3" /> = shown on report &nbsp;|&nbsp; <EyeOff className="w-3 h-3" /> = hidden from report
        </p>

        {GROUPS.map(group => {
          const fields = CUSTOM_FIELDS.filter(f => f.group === group);
          return (
            <div key={group}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">{group}</p>
              <div className="space-y-1.5">
                {fields.map(f => {
                  const val = draft[f.key] || '';
                  const onReport = visibleFields.has(f.key);
                  return (
                    <div key={f.key} className="flex items-start gap-2">
                      <button
                        onClick={() => toggleReportField(f.key)}
                        className={`mt-2 flex-shrink-0 p-0.5 rounded transition-colors ${onReport ? 'text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}
                        title={onReport ? 'Visible on report – tap to hide' : 'Hidden from report – tap to show'}
                      >
                        {onReport ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <label className="text-[11px] font-medium text-muted-foreground">{f.label}</label>
                        {editing ? (
                          CHECKBOX_FIELDS.has(f.key) ? (
                            <button
                              onClick={() => setDraft(prev => ({ ...prev, [f.key]: prev[f.key] === 'Yes' ? '' : 'Yes' }))}
                              className={`mt-1 w-full h-9 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                                val === 'Yes'
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                              }`}
                            >
                              {val === 'Yes' ? '✓ Yes' : 'No'}
                            </button>
                          ) : f.key === 'comments_or_notes' || f.key === 'site_induction_details' ? (
                            <textarea
                              value={val}
                              onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                              rows={2}
                              className="w-full px-2 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                              className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          )
                        ) : (
                          <div className="text-sm min-h-[24px] flex items-center">
                            {val && isLink(val) ? (
                              <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 truncate">
                                {val.replace(/https?:\/\//, '').slice(0, 45)}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <span className={val ? 'text-foreground' : 'text-muted-foreground/40 italic text-xs'}>{val || 'Not set'}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
