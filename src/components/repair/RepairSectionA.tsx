import { useState, useEffect } from 'react';
import { RepairFormData } from '@/pages/RepairBreakdownForm';
import { RepairButtonGroup } from './RepairButtonGroup';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter } from 'lucide-react';

interface Props {
  formData: RepairFormData;
  updateForm: (updates: Partial<RepairFormData>) => void;
  assetId?: string;
}

interface OpenDefect {
  id: string;
  question_text: string;
  urgency: string | null;
  comment: string | null;
  created_at: string;
  defect_types: string[];
}

const JOB_TYPES = ['Breakdown (Emergency)', 'Urgent Repair', 'Scheduled Repair', 'Defect Rectification (Inspection)', 'Warranty', 'Upgrade / Modification'];
const FAULT_SOURCES = ['Inspection Defect', 'Operator Report', 'Site Management Report', 'Preventative Maintenance', 'Other'];
const ARRIVAL_STATUSES = ['Operational', 'Restricted Use', 'Isolated / Out of Service', 'Unknown'];
const URGENCY_OPTIONS = ['Immediate – Unsafe', 'Urgent', 'Scheduled', 'Non-critical'];

const URGENCY_COLORS: Record<string, string> = {
  'Immediate – Unsafe': 'bg-destructive text-destructive-foreground',
  'Urgent': 'bg-rka-orange text-destructive-foreground',
};

export function RepairSectionA({ formData, updateForm, assetId }: Props) {
  const [openDefects, setOpenDefects] = useState<OpenDefect[]>([]);
  const [loadingDefects, setLoadingDefects] = useState(false);
  const [defectSearch, setDefectSearch] = useState('');
  const [defectFilter, setDefectFilter] = useState<string | null>(null);

  // Load open defects when "Inspection Defect" is selected
  useEffect(() => {
    if (formData.fault_source !== 'Inspection Defect' || !assetId) return;
    const loadDefects = async () => {
      setLoadingDefects(true);
      const { data } = await supabase
        .from('inspection_responses')
        .select('id, question_id, urgency, comment, created_at, defect_types')
        .eq('defect_flag', true)
        .in('inspection_id', (
          await supabase
            .from('db_inspections')
            .select('id')
            .eq('asset_id', assetId)
        ).data?.map(d => d.id) || []);

      if (data) {
        // Get question texts
        const qIds = [...new Set(data.map(d => d.question_id))];
        const { data: questions } = await supabase
          .from('question_library')
          .select('question_id, question_text')
          .in('question_id', qIds);
        const qMap = Object.fromEntries((questions || []).map(q => [q.question_id, q.question_text]));

        setOpenDefects(data.map(d => ({
          id: d.id,
          question_text: qMap[d.question_id] || d.question_id,
          urgency: d.urgency,
          comment: d.comment,
          created_at: d.created_at,
          defect_types: d.defect_types || [],
        })));
      }
      setLoadingDefects(false);
    };
    loadDefects();
  }, [formData.fault_source, assetId]);

  const filteredDefects = openDefects
    .filter(d => !defectFilter || d.urgency === defectFilter)
    .filter(d => !defectSearch || d.question_text.toLowerCase().includes(defectSearch.toLowerCase()) || d.comment?.toLowerCase().includes(defectSearch.toLowerCase()))
    .sort((a, b) => {
      const order = { 'Immediate': 0, 'Urgent': 1, 'Scheduled': 2, 'Monitor': 3 };
      return (order[a.urgency as keyof typeof order] ?? 4) - (order[b.urgency as keyof typeof order] ?? 4);
    });

  const toggleDefect = (id: string) => {
    const current = formData.linked_defect_ids;
    const updated = current.includes(id) ? current.filter(d => d !== id) : [...current, id];
    updateForm({ linked_defect_ids: updated });
  };

  return (
    <div className="px-4 py-3 space-y-5">
      {/* 1. Job Type */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Job Type *</label>
        <RepairButtonGroup options={JOB_TYPES} value={formData.job_type} onChange={v => updateForm({ job_type: v })} />
      </div>

      {/* 2. Source of Fault */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Source of Fault *</label>
        <RepairButtonGroup options={FAULT_SOURCES} value={formData.fault_source} onChange={v => updateForm({ fault_source: v, linked_defect_ids: [] })} />
      </div>

      {/* Defect Selector (conditional) */}
      {formData.fault_source === 'Inspection Defect' && (
        <div className="border border-border rounded-xl p-3 space-y-3">
          <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            🔍 Select Defects Being Rectified
          </label>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search defects…"
              value={defectSearch}
              onChange={e => setDefectSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {['Immediate', 'Urgent', 'Scheduled', 'Monitor'].map(f => (
              <button
                key={f}
                onClick={() => setDefectFilter(defectFilter === f ? null : f)}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${
                  defectFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Defect list */}
          {loadingDefects ? (
            <p className="text-xs text-muted-foreground py-2">Loading defects…</p>
          ) : filteredDefects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No open defects found for this asset</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-auto">
              {filteredDefects.map(d => {
                const selected = formData.linked_defect_ids.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDefect(d.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                      selected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                        selected ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {selected && <span className="text-primary-foreground text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{d.question_text}</p>
                        {d.comment && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{d.comment}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {d.urgency && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              d.urgency === 'Immediate' ? 'bg-destructive/10 text-destructive' :
                              d.urgency === 'Urgent' ? 'bg-rka-orange/10 text-rka-orange' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {d.urgency}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {formData.linked_defect_ids.length > 0 && (
            <p className="text-xs font-bold text-primary">{formData.linked_defect_ids.length} defect(s) selected</p>
          )}
        </div>
      )}

      {/* 3. Asset Status on Arrival */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Asset Status on Arrival *</label>
        <RepairButtonGroup options={ARRIVAL_STATUSES} value={formData.asset_status_on_arrival} onChange={v => updateForm({ asset_status_on_arrival: v })} />
        <textarea
          placeholder="Comment (optional)"
          value={formData.arrival_status_comment}
          onChange={e => updateForm({ arrival_status_comment: e.target.value })}
          className="mt-2 w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
          rows={2}
        />
      </div>

      {/* 4. Urgency Assessment */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Urgency Assessment *</label>
        <RepairButtonGroup
          options={URGENCY_OPTIONS}
          value={formData.urgency_assessment}
          onChange={v => updateForm({ urgency_assessment: v })}
          colorMap={URGENCY_COLORS}
        />
      </div>

      {/* 5. Customer Reported Issue */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Customer Reported Issue *</label>
        <input
          type="text"
          placeholder="Describe the reported issue…"
          value={formData.customer_reported_issue}
          onChange={e => updateForm({ customer_reported_issue: e.target.value })}
          className="w-full text-sm rounded-lg border border-border bg-background p-3"
        />
      </div>
    </div>
  );
}
