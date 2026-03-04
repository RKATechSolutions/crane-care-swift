import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Save, ExternalLink } from 'lucide-react';
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

const CUSTOM_FIELDS: { key: keyof ClientData; label: string }[] = [
  { key: 'location_address', label: 'Address' },
  { key: 'primary_contact_name', label: 'Primary Contact' },
  { key: 'primary_contact_email', label: 'Contact Email' },
  { key: 'primary_contact_mobile', label: 'Contact Mobile' },
  { key: 'primary_contact_position', label: 'Contact Position' },
  { key: 'abn', label: 'ABN' },
  { key: 'business_type', label: 'Business Type' },
  { key: 'automatic_service_package', label: 'Automatic Service Package' },
  { key: 'casual_service_rates', label: 'Casual Service Rates' },
  { key: 'priority_service_package', label: 'Priority Service Package' },
  { key: 'services_interested_in', label: 'Services Interested In' },
  { key: 'lead_or_referral_source', label: 'Lead / Referral Source' },
  { key: 'payment_days', label: 'Payment Days' },
  { key: 'preferred_days_and_times', label: 'Preferred Days & Times' },
  { key: 'required_to_complete_work', label: 'Required to Complete Work' },
  { key: 'send_schedule_reminders', label: 'Send Schedule Reminders' },
  { key: 'site_induction_details', label: 'Site Induction Details' },
  { key: 'travel_time_from_base', label: 'Travel Time from Base' },
  { key: 'planned_service_dates', label: 'Planned Service Dates' },
  { key: 'comments_or_notes', label: 'Comments / Notes' },
  { key: 'google_drive_link', label: 'Google Drive Link' },
  { key: 'inspectall_account_link', label: 'Inspectall Link' },
  { key: 'inspectall_code', label: 'Inspectall Code' },
];

export function ClientDetailSection({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
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

  if (!client) return null;

  const isLink = (v: string) => v.startsWith('http');

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30"
      >
        <div className="text-left">
          <p className="font-bold text-sm">Client Details</p>
          <p className="text-xs text-muted-foreground">{client.primary_contact_name || 'No contact'} • {client.primary_contact_mobile || ''}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-2 bg-background">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setEditing(!editing)}
              className="flex-1 h-8 bg-accent text-accent-foreground rounded-lg text-xs font-medium"
            >
              {editing ? 'Cancel Edit' : 'Edit Details'}
            </button>
            {editing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-8 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>

          {CUSTOM_FIELDS.map(f => {
            const val = draft[f.key] || '';
            const onReport = visibleFields.has(f.key);
            return (
              <div key={f.key} className="flex items-start gap-2">
                <button
                  onClick={() => toggleReportField(f.key)}
                  className={`mt-1.5 flex-shrink-0 p-1 rounded ${onReport ? 'text-primary' : 'text-muted-foreground/40'}`}
                  title={onReport ? 'Visible on report' : 'Hidden from report'}
                >
                  {onReport ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</label>
                  {editing ? (
                    <input
                      type="text"
                      value={val}
                      onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full h-8 px-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  ) : (
                    <div className="text-sm min-h-[24px] flex items-center">
                      {isLink(val) ? (
                        <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 truncate">
                          {val.replace(/https?:\/\//, '').slice(0, 40)}...
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className={val ? 'text-foreground' : 'text-muted-foreground/50'}>{val || '—'}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
