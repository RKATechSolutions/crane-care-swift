import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ChevronRight, ChevronLeft, CheckCircle, Loader2, Save, FileText, Sparkles, Send, Download, Eye } from 'lucide-react';
import { generateBaselinePdf } from '@/utils/generateBaselinePdf';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import type jsPDF from 'jspdf';

interface CraneBaselineFormProps {
  existingId?: string;
  onBack: () => void;
  mode?: 'technician' | 'customer';
  customerSiteName?: string;
}

// Lean, customer-only flow. Anything AroFlo or InspectAll already holds
// (breakdowns, jobs, quotes, defects, crane count, contacts) is NOT asked here —
// it is pre-filled and shown read-only on the Summary. These sections cover only
// what no system knows: the business impact of a stoppage and how the customer's
// own decisions and practices work.
const SECTIONS = [
  { id: 'operation', label: 'Operation' },
  { id: 'cost', label: 'Cost of Downtime' },
  { id: 'resilience', label: 'Resilience' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'practices', label: 'Practices' },
  { id: 'people', label: 'People' },
  { id: 'planning', label: 'Planning' },
  { id: 'perspective', label: 'Your View' },
  { id: 'summary', label: 'Summary' },
];

const YES_PARTIAL_NO = ['Yes', 'Partially', 'No'];
const YES_SOMEWHAT_NO = ['Yes', 'Somewhat', 'No'];

// Select fields where "Yes" is the healthy answer. Drives the System Maturity Score.
const MATURITY_FIELDS = [
  'cleanliness_standard', 'workshop_tidy', 'environmental_factors', 'crane_hazards_meetings',
  'breakdown_response_process', 'preventative_maintenance', 'pre_start_inspections', 'logbooks_updated', 'findings_reviewed', 'defects_tracked',
  'walkways_clear', 'signage_current', 'ppe_worn', 'within_capacity', 'lifting_register_maintained', 'load_handling_education', 'complex_lifts_process',
  'competency_matrix', 'supervisors_trained', 'near_misses_recorded', 'near_misses_reviewed',
  'design_work_period', 'remaining_service_life', 'digital_monitoring', 'capital_forecast', 'duty_classification_reassessed',
  'reports_electronic', 'reports_risk_ranking', 'engineering_advice', 'lifecycle_planning',
  'decision_maker_reachable', 'critical_spares_onsite',
];

// Score a Yes / Partially(Somewhat) / No answer. Returns -1 when unanswered so it can be excluded.
const scoreAnswer = (v: string): number => {
  const lower = (v || '').toLowerCase();
  if (lower === 'yes') return 2;
  if (lower === 'partially' || lower === 'somewhat') return 1;
  if (lower === 'no') return 0;
  return -1;
};

// Fields that are answered by the customer (pre-visit sections)
const CUSTOMER_FIELDS = new Set([
  'company_name', 'site_location', 'main_contact_name', 'role_position',
  'number_of_cranes', 'operating_hours_per_day', 'shifts_per_day', 'days_per_week',
  'production_increased', 'breakdowns', 'avg_downtime', 'longest_downtime',
  'avg_response_time', 'scheduled_visits', 'emergency_visits', 'first_time_fix',
  'top_recurring_issues', 'rev_hour', 'labour_cost_per_hour', 'backup_crane',
  'value_most', 'most_frustrating', 'magic_wand',
  // Production & Risk (customer pre-visit)
  'preventable_breakdowns', 'lifts_per_shift', 'crane_single_point_failure',
  'idle_headcount_during_downtime', 'overtime_hours_downtime', 'penalty_per_missed_dispatch',
  'critical_spares_onsite', 'critical_part_lead_time',
  // Responsiveness (customer pre-visit)
  'quote_approval_lag', 'repairs_approved_per_10', 'declined_work_value',
  'approval_threshold', 'capital_budget_month', 'decision_maker_reachable',
  'acts_on_recommendations',
]);

// Fields auto-filled from AroFlo + InspectAll — shown read-only on the Summary,
// never asked in the question flow.
const AUTO_FILLED_ROWS: { label: string; key: string; prefix?: string; suffix?: string; pct10?: boolean }[] = [
  { label: 'Cranes on site', key: 'number_of_cranes' },
  { label: 'Breakdowns (last 12 mo)', key: 'breakdowns' },
  { label: 'Avg downtime / breakdown', key: 'avg_downtime', suffix: ' hrs' },
  { label: 'Emergency call-outs', key: 'emergency_visits' },
  { label: 'Scheduled visits', key: 'scheduled_visits' },
  { label: 'First-time fix', key: 'first_time_fix', suffix: '%' },
  { label: 'Advice adoption (from records)', key: 'repairs_approved_per_10', suffix: '%', pct10: true },
  { label: 'Avg quote → approval', key: 'quote_approval_lag', suffix: ' days' },
  { label: 'Deferred work value', key: 'declined_work_value', prefix: '$' },
];

type FormData = Record<string, string | number | null>;

export default function CraneBaselineForm({ existingId, onBack, mode = 'technician', customerSiteName }: CraneBaselineFormProps) {
  const { state } = useApp();
  const { toast } = useToast();
  const isCustomer = mode === 'customer';
  // In customer mode we don't have site context from AppContext
  const site = isCustomer ? { id: '', name: customerSiteName || '' } : state.selectedSite!;

  const [sectionIdx, setSectionIdx] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(existingId || '');
  const [status, setStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [previewPdfDoc, setPreviewPdfDoc] = useState<jsPDF | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [submittedByCustomer, setSubmittedByCustomer] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load existing
  useEffect(() => {
    if (!existingId) {
      if (!isCustomer) setFormData(prev => ({ ...prev, company_name: site.name }));
      return;
    }
    const load = async () => {
      const { data } = await supabase.from('crane_baselines').select('*').eq('id', existingId).single();
      if (data) {
        setStatus(data.status as any);
        if (data.ai_summary) setAiSummary(data.ai_summary);
        const fd: FormData = {};
        Object.entries(data).forEach(([k, v]) => {
          if (!['id', 'created_at', 'updated_at', 'client_id', 'ai_summary'].includes(k) && v !== null) {
            fd[k] = v as any;
          }
        });
        setFormData(fd);
      }
    };
    load();
  }, [existingId]);

  // Autosave with debounce
  const doAutosave = useCallback(async (data: FormData, currentRecordId: string) => {
    const payload: any = {
      site_name: data.company_name || site.name || 'Unknown',
      status: 'in_progress',
      ...data,
    };

    if (!isCustomer) {
      const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
      payload.client_id = clientId;
      payload.technician_id = state.currentUser?.id;
      payload.technician_name = state.currentUser?.name;
    }
    delete payload.status_label;

    try {
      if (currentRecordId) {
        await supabase.from('crane_baselines').update(payload).eq('id', currentRecordId);
      } else {
        const { data: newRecord } = await supabase.from('crane_baselines').insert(payload).select('id').single();
        if (newRecord) setRecordId(newRecord.id);
      }
      setLastSaved(new Date());
    } catch {
      // Silent fail for autosave
    }
  }, [site, state.currentUser, isCustomer]);

  const set = (key: string, value: string | number | null) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        doAutosave(next, recordId);
      }, 2000);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  const num = (key: string): number => {
    const v = formData[key];
    return typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) || 0 : 0);
  };

  const str = (key: string): string => {
    const v = formData[key];
    return typeof v === 'string' ? v : (v !== null && v !== undefined ? String(v) : '');
  };

  // Calculations
  const calc = useMemo(() => {
    const breakdowns = num('breakdowns');
    const avgDowntime = num('avg_downtime');
    const emergencyVisits = num('emergency_visits');
    const scheduledVisits = num('scheduled_visits');
    const revHour = num('rev_hour');
    const labourCost = num('labour_cost_per_hour');
    const totalOps = num('total_operators');
    const refresherOps = num('refresher_operators');
    const backupCrane = str('backup_crane');

    const annualDowntime = breakdowns * avgDowntime;
    const reactiveRatio = (emergencyVisits + scheduledVisits) > 0
      ? (emergencyVisits / (emergencyVisits + scheduledVisits)) * 100 : 0;
    const mttr = breakdowns > 0 ? annualDowntime / breakdowns : 0;
    const costPerBreakdown = revHour * avgDowntime;
    const annualCost = costPerBreakdown * breakdowns;
    const adjustedCost = backupCrane === 'No' ? annualCost * 1.2 : annualCost;
    const trainingCoverage = totalOps > 0 ? (refresherOps / totalOps) * 100 : 0;

    // ── Reliability: MTBF & Availability ──
    const scheduledHours = num('operating_hours_per_day') * num('days_per_week') * 52;
    const mtbf = breakdowns > 0 && scheduledHours > 0 ? scheduledHours / breakdowns : 0;
    const availability = scheduledHours > 0
      ? Math.max(0, (scheduledHours - annualDowntime) / scheduledHours) * 100 : 0;

    // ── Accountability: Preventability & Advice Adoption ──
    const preventable = num('preventable_breakdowns');
    const preventabilityIndex = breakdowns > 0 ? (preventable / breakdowns) * 100 : 0;
    const adoptionRate = formData.repairs_approved_per_10 != null ? (num('repairs_approved_per_10') / 10) * 100 : 0;
    const deferredRiskExposure = num('declined_work_value');

    // ── True cost of downtime (idle labour + overtime on top of lost revenue) ──
    const idleHeadcount = num('idle_headcount_during_downtime');
    const overtimeHours = num('overtime_hours_downtime');
    const trueCostPerHour = revHour + idleHeadcount * labourCost;
    const trueAnnualCost = annualDowntime * trueCostPerHour + overtimeHours * labourCost;

    // ── System Maturity Score (0–100) from all "Yes is good" questions ──
    let maturityPoints = 0;
    let maturityMax = 0;
    MATURITY_FIELDS.forEach(k => {
      const s = scoreAnswer(str(k));
      if (s >= 0) { maturityPoints += s; maturityMax += 2; }
    });
    const maturityScore = maturityMax > 0 ? (maturityPoints / maturityMax) * 100 : 0;

    // ── Responsiveness Score (0–100): average of answered sub-scores ──
    const respParts: number[] = [];
    if (formData.repairs_approved_per_10 != null) respParts.push(adoptionRate);
    if (formData.quote_approval_lag != null) {
      // 0 days = 100, 30+ days = 0
      respParts.push(Math.max(0, 100 - (num('quote_approval_lag') / 30) * 100));
    }
    if (str('decision_maker_reachable')) {
      respParts.push(scoreAnswer(str('decision_maker_reachable')) / 2 * 100);
    }
    const responsivenessScore = respParts.length ? respParts.reduce((a, b) => a + b, 0) / respParts.length : 0;

    return {
      annualDowntime, reactiveRatio, mttr, costPerBreakdown, annualCost, adjustedCost, trainingCoverage,
      mtbf, availability, preventabilityIndex, adoptionRate, deferredRiskExposure,
      trueAnnualCost, maturityScore, responsivenessScore,
    };
  }, [formData]);

  const save = async () => {
    setSaving(true);
    await doAutosave(formData, recordId);
    toast({ title: 'Saved', description: 'Baseline saved successfully.' });
    setSaving(false);
  };

  const complete = async () => {
    setStatus('completed');
    setSaving(true);
    const clientId = !isCustomer && site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    const payload: any = {
      site_name: str('company_name') || site.name,
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...formData,
    };
    if (!isCustomer) {
      payload.client_id = clientId;
      payload.technician_id = state.currentUser?.id;
      payload.technician_name = state.currentUser?.name;
    }

    try {
      if (recordId) {
        await supabase.from('crane_baselines').update(payload).eq('id', recordId);
      } else {
        const { data } = await supabase.from('crane_baselines').insert(payload).select('id').single();
        if (data) setRecordId(data.id);
      }
      toast({ title: 'Completed', description: 'Baseline completed and saved.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to complete.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const notifyTeam = async () => {
    // Save first
    await save();
    setSendingNotification(true);
    try {
      const { error } = await supabase.functions.invoke('notify-baseline-complete', {
        body: {
          companyName: str('company_name'),
          siteName: str('site_location') || str('company_name'),
          baselineId: recordId,
        },
      });
      if (error) throw error;
      setSubmittedByCustomer(true);
      toast({ title: 'Submitted!', description: 'RKA has been notified. Our team will review your details before your visit.' });
    } catch (e: any) {
      toast({ title: 'Saved', description: 'Your progress has been saved. Please let RKA know you\'ve completed the form.', variant: 'destructive' });
    }
    setSendingNotification(false);
  };

  const generateAiSummary = async () => {
    if (!recordId) await save();
    if (!recordId) {
      toast({ title: 'Error', description: 'Please save the form first.', variant: 'destructive' });
      return;
    }
    setGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-baseline-summary', {
        body: { baselineId: recordId },
      });
      if (error) throw error;
      if (data?.summary) {
        setAiSummary(data.summary);
        toast({ title: 'AI Summary Generated', description: 'Strategic summary is ready.' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to generate AI summary.', variant: 'destructive' });
    }
    setGeneratingAi(false);
  };

  const handleExportPdf = async () => {
    setGeneratingPdf(true);
    try {
      // Pull per-crane inspection findings (last 12 months) for this site, aggregated by crane.
      const siteKey = str('company_name') || site.name;
      let defectSummary: { crane: string; fails: number; urgent: number; scheduled: number; monitor: number }[] | undefined;
      try {
        const { data: defectRows } = await (supabase as any)
          .from('v_crane_defect_summary')
          .select('crane, fails, immediate, urgent, scheduled, monitor')
          .eq('site_name', siteKey);
        if (defectRows && defectRows.length) {
          const byCrane: Record<string, { crane: string; fails: number; urgent: number; scheduled: number; monitor: number }> = {};
          defectRows.forEach((r: any) => {
            const k = r.crane || 'Unknown';
            if (!byCrane[k]) byCrane[k] = { crane: k, fails: 0, urgent: 0, scheduled: 0, monitor: 0 };
            byCrane[k].fails += r.fails || 0;
            byCrane[k].urgent += (r.immediate || 0) + (r.urgent || 0);
            byCrane[k].scheduled += r.scheduled || 0;
            byCrane[k].monitor += r.monitor || 0;
          });
          defectSummary = Object.values(byCrane);
        }
      } catch {
        // Inspection findings are optional — report still generates without them.
      }

      const doc = await generateBaselinePdf({
        siteName: site.name,
        companyName: str('company_name'),
        technicianName: state.currentUser?.name || '',
        formData,
        calculations: calc,
        defectSummary,
        aiSummary: aiSummary || undefined,
      });
      setPreviewPdfDoc(doc);
      return doc;
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
      return null;
    }
    setGeneratingPdf(false);
  };

  const handleDownloadPdf = async () => {
    let doc = previewPdfDoc;
    if (!doc) doc = await handleExportPdf();
    if (doc) {
      const dateStr = format(new Date(), 'dd-MM-yyyy');
      const filename = `${str('company_name') || site.name} Baseline Report ${dateStr}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');
      doc.save(filename);
    }
  };

  const isTechField = (key: string) => !CUSTOMER_FIELDS.has(key);

  const renderNumberField = (label: string, key: string, placeholder = '0', suffix?: string) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={formData[key] ?? ''}
          onChange={e => set(key, e.target.value ? parseFloat(e.target.value) : null)}
          placeholder={placeholder}
          className={`flex-1 h-11 px-3 border border-border rounded-lg bg-background text-sm ${isTechField(key) && formData[key] != null ? 'font-bold' : ''}`}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  const renderTextField = (label: string, key: string, required = false) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type="text"
        value={str(key)}
        onChange={e => set(key, e.target.value)}
        className={`w-full h-11 px-3 border border-border rounded-lg bg-background text-sm ${isTechField(key) && str(key) ? 'font-bold' : ''}`}
      />
    </div>
  );

  const renderTextArea = (label: string, key: string) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <textarea
        value={str(key)}
        onChange={e => set(key, e.target.value)}
        rows={3}
        className={`w-full p-3 border border-border rounded-lg bg-background text-sm resize-none ${isTechField(key) && str(key) ? 'font-bold' : ''}`}
      />
    </div>
  );

  const renderSelect = (label: string, key: string, options: string[]) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => set(key, str(key) === opt ? null : opt)}
            className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
              str(key) === opt
                ? `bg-primary text-primary-foreground ${isTechField(key) ? 'font-extrabold ring-2 ring-primary/50' : 'font-bold'}`
                : 'bg-muted text-foreground border border-border font-medium'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCalcField = (label: string, value: number, prefix = '', suffix = '', explainer?: string) => (
    <div className="bg-muted/50 border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">
        {prefix}{isNaN(value) || !isFinite(value) ? '—' : value.toLocaleString('en-AU', { maximumFractionDigits: 1 })}{suffix}
      </p>
      {explainer && <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{explainer}</p>}
    </div>
  );

  const renderReadOnly = (label: string, display: string) => (
    <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{display}</span>
    </div>
  );

  const currentSection = SECTIONS[sectionIdx];

  const renderSection = () => {
    switch (currentSection.id) {
      case 'operation':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">We've already pulled your crane list, service history and quotes from our records — you'll see them on the Summary. These few questions cover the things only you can tell us, so we can prove in black and white where the gains are.</p>
            </div>
            {renderNumberField('Operating Hours per Day', 'operating_hours_per_day')}
            {renderNumberField('Shifts per Day', 'shifts_per_day')}
            {renderNumberField('Days per Week', 'days_per_week')}
            {renderNumberField('Lifts (or Tonnes) Moved per Shift', 'lifts_per_shift')}
            {renderSelect('Has production grown in the last 3–5 years?', 'production_increased', ['No', 'Slightly', 'Significantly'])}
          </div>
        );

      case 'cost':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">What a stopped crane actually costs your business — the numbers no inspection can see. This turns downtime hours into dollars.</p>
            </div>
            {renderNumberField('Revenue Generated per Production Hour', 'rev_hour', '0', '$')}
            {renderNumberField('Labour Cost per Downtime Hour', 'labour_cost_per_hour', '0', '$')}
            {renderNumberField('People Standing Idle When a Crane Stops', 'idle_headcount_during_downtime', '0', 'people')}
            {renderNumberField('Overtime Hours Caused by Downtime (Last 12 Months)', 'overtime_hours_downtime', '0', 'hours')}
            {renderNumberField('Penalty / Late-Delivery Cost per Missed Dispatch', 'penalty_per_missed_dispatch', '0', '$')}
            {renderSelect('Backup Crane Available?', 'backup_crane', ['Yes', 'No'])}

            <div className="pt-2 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live Impact</p>
              {renderCalcField('True Annual Cost of Downtime', calc.trueAnnualCost, '$', '', 'Lost revenue plus idle labour and overtime — the full hit downtime takes on the business, not just the crane.')}
            </div>
          </div>
        );

      case 'resilience':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">How exposed you are when a crane stops — criticality, backup and spares. Only you know your production layout.</p>
            </div>
            {renderSelect('Is any crane a single point of failure for the line?', 'crane_single_point_failure', YES_PARTIAL_NO)}
            {renderSelect('Are critical spare parts held onsite?', 'critical_spares_onsite', YES_PARTIAL_NO)}
            {renderNumberField('Typical Lead Time for a Critical Spare Part', 'critical_part_lead_time', '0', 'days')}
          </div>
        );

      case 'decisions':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">How decisions get made when work is recommended. Our records show how fast things move — these tell us why, so delays can be fixed at the source.</p>
            </div>
            {renderSelect('When we recommend repairs, are they approved promptly?', 'acts_on_recommendations', YES_PARTIAL_NO)}
            {renderSelect('Is a decision-maker reachable on-site for sign-off?', 'decision_maker_reachable', YES_PARTIAL_NO)}
            {renderTextField('Spend Sign-Off Threshold / Who Approves', 'approval_threshold')}
            {renderTextField('When Is the Capital Budget Set Each Year?', 'capital_budget_month')}
          </div>
        );

      case 'practices':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">Your team's day-to-day habits around the cranes — the system around the machine.</p>
            </div>
            {renderSelect('Operators complete pre-start inspections?', 'pre_start_inspections', YES_PARTIAL_NO)}
            {renderSelect('Logbooks kept up to date?', 'logbooks_updated', YES_PARTIAL_NO)}
            {renderSelect('Documented breakdown response process?', 'breakdown_response_process', YES_PARTIAL_NO)}
            {renderSelect('Inspection findings reviewed by management?', 'findings_reviewed', YES_PARTIAL_NO)}
            {renderSelect('Defects tracked through to close-out?', 'defects_tracked', YES_PARTIAL_NO)}
            {renderSelect('Workers trained in safe load handling?', 'load_handling_education', YES_PARTIAL_NO)}
            {renderSelect('Formal process for complex lifts?', 'complex_lifts_process', YES_PARTIAL_NO)}
            {renderSelect('Crane hazards discussed in safety meetings?', 'crane_hazards_meetings', YES_SOMEWHAT_NO)}
          </div>
        );

      case 'people':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">Operator competency and your near-miss culture — the people side no inspection captures.</p>
            </div>
            {renderNumberField('Total Crane Operators', 'total_operators')}
            {renderNumberField('Operators with Refresher Training (Last 2 Years)', 'refresher_operators')}
            {renderSelect('Competency matrix exists?', 'competency_matrix', YES_PARTIAL_NO)}
            {renderSelect('Supervisors trained in crane risk?', 'supervisors_trained', YES_PARTIAL_NO)}
            {renderSelect('Near misses recorded?', 'near_misses_recorded', YES_PARTIAL_NO)}
            {renderSelect('Near misses formally reviewed?', 'near_misses_reviewed', YES_PARTIAL_NO)}

            <div className="pt-2">
              {renderCalcField('Training Coverage Rate', calc.trainingCoverage, '', '%', 'Percentage of operators with up-to-date refresher training. Below 80% indicates a training gap.')}
            </div>
          </div>
        );

      case 'planning':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">How far ahead you're planning for your crane assets — where most sites have the biggest blind spots.</p>
            </div>
            {renderSelect("Do you know each crane's Design Work Period?", 'design_work_period', YES_PARTIAL_NO)}
            {renderSelect("Do you know each crane's remaining service life?", 'remaining_service_life', YES_PARTIAL_NO)}
            {renderSelect('2–5 year capital forecast for crane assets?', 'capital_forecast', YES_PARTIAL_NO)}
            {renderSelect('Duty classification reviewed since production changed?', 'duty_classification_reassessed', YES_PARTIAL_NO)}
            {renderSelect('Interested in real-time / digital crane monitoring?', 'digital_monitoring', YES_PARTIAL_NO)}
          </div>
        );

      case 'perspective':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">In your words — this shapes how we work with you.</p>
            </div>
            {renderTextArea('What do you value most about your current crane partner?', 'value_most')}
            {renderTextArea('What has been most frustrating?', 'most_frustrating')}
            {renderTextArea('If you had a magic wand, what would you fix?', 'magic_wand')}
          </div>
        );

      case 'summary': {
        const autoRows = AUTO_FILLED_ROWS
          .filter(r => formData[r.key] != null && formData[r.key] !== '')
          .map(r => {
            const base = r.pct10 ? num(r.key) * 10 : num(r.key);
            const display = `${r.prefix || ''}${base.toLocaleString('en-AU', { maximumFractionDigits: 1 })}${r.suffix || ''}`;
            return { label: r.label, display };
          });
        const hasAuto = autoRows.length > 0 || !!str('top_recurring_issues');
        // Self-report vs measured adoption gap
        const saysPrompt = str('acts_on_recommendations') === 'Yes';
        const measuredAdoption = formData.repairs_approved_per_10 != null ? num('repairs_approved_per_10') * 10 : null;
        const showGap = saysPrompt && measuredAdoption != null && measuredAdoption < 60;

        return (
          <div className="space-y-6">
            {hasAuto && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">📂 What your records already tell us</h3>
                <p className="text-[10px] text-muted-foreground mb-2 leading-tight">Pulled automatically from our service history and inspections — no need to re-enter.</p>
                <div className="bg-muted/30 border border-border rounded-xl p-3">
                  {autoRows.map(r => renderReadOnly(r.label, r.display))}
                  {str('top_recurring_issues') && (
                    <div className="pt-2 mt-1">
                      <p className="text-xs text-muted-foreground mb-1">Recurring issues (from inspections)</p>
                      <p className="text-xs text-foreground leading-snug">{str('top_recurring_issues')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showGap && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-xs font-bold text-foreground mb-1">Worth a conversation</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  You rated approvals as prompt, yet our records show only {Math.round(measuredAdoption!)}% of recommended repairs were approved. Closing that gap is often the single biggest lever on your results.
                </p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">⭐ Headline Scores</h3>
              <div className="grid grid-cols-2 gap-3">
                {renderCalcField('System Maturity Score', calc.maturityScore, '', '/ 100', 'Your overall systems health across practices, people, planning and decision-making. The single number to grow year on year.')}
                {renderCalcField('Responsiveness Score', calc.responsivenessScore, '', '/ 100', 'How fast recommended work is approved and actioned — the customer-side lever on results.')}
                {renderCalcField('Crane Availability', calc.availability, '', '%', 'Share of scheduled time the crane is available. World-class is above 95%.')}
                {renderCalcField('Preventability Index', calc.preventabilityIndex, '', '%', 'Share of breakdowns that were avoidable — flagged before but not actioned.')}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">🏗 Reliability Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {renderCalcField('Annual Downtime', calc.annualDowntime, '', ' hrs', 'Total crane downtime per year from all breakdowns.')}
                {renderCalcField('Reactive Ratio', calc.reactiveRatio, '', '%', 'Share of maintenance that is unplanned emergency work.')}
                {renderCalcField('Mean Time To Repair', calc.mttr, '', ' hrs', 'Average hours from breakdown to crane back in service.')}
                {renderCalcField('Mean Time Between Failures', calc.mtbf, '', ' hrs', 'Average operating hours between breakdowns — higher is better.')}
                {renderCalcField('First-Time Fix', num('first_time_fix'), '', '%', 'How often issues are resolved on the first visit.')}
                {renderCalcField('Advice Adoption', calc.adoptionRate, '', '%', 'Share of recommended repairs the customer approves.')}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">💰 Financial Exposure</h3>
              <div className="grid grid-cols-2 gap-3">
                {renderCalcField('Cost Per Breakdown', calc.costPerBreakdown, '$', '', 'Revenue lost each time a crane goes down.')}
                {renderCalcField('Annual Cost', calc.annualCost, '$', '', 'Total yearly revenue impact from all crane downtime.')}
                {renderCalcField('True Annual Cost', calc.trueAnnualCost, '$', '', 'Lost revenue plus idle labour and overtime — the full business impact.')}
                {renderCalcField('Deferred Risk Exposure', calc.deferredRiskExposure, '$', '', 'Value of recommended work not yet approved.')}
                {str('backup_crane') === 'No' && renderCalcField('Adjusted Cost (No Backup)', calc.adjustedCost, '$', '', 'Includes 20% buffer for no backup crane — covers overtime, delays and penalties.')}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">🎓 Education Indicator</h3>
              {renderCalcField('Training Coverage Rate', calc.trainingCoverage, '', '%', 'Percentage of operators with current refresher training.')}
            </div>

            {/* AI Summary — Tech only */}
            {!isCustomer && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">🤖 AI Strategic Summary & Recommendations</h3>
                  <button
                    onClick={generateAiSummary}
                    disabled={generatingAi}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {generatingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiSummary ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                {generatingAi && (
                  <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground">Analysing baseline data and generating strategic summary...</p>
                  </div>
                )}
                {aiSummary && !generatingAi && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiSummary}</div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {isCustomer
                  ? 'Thank you for completing this pre-visit assessment. RKA will review your details and discuss findings during the onsite visit.'
                  : 'This assessment establishes your current crane performance baseline. During our onsite visit, we will review these findings and identify opportunities to reduce risk, downtime, and lifecycle cost.'}
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Baseline Date: {new Date().toLocaleDateString('en-AU')}
              </p>
              <p className="text-xs text-muted-foreground">
                We recommend reassessing these indicators in 12 months to measure measurable improvement.
              </p>
            </div>

            {/* Customer mode: Save & Notify */}
            {isCustomer && !submittedByCustomer && (
              <button
                onClick={notifyTeam}
                disabled={sendingNotification}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                {sendingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Save & Notify RKA Team
              </button>
            )}

            {isCustomer && submittedByCustomer && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Submitted Successfully</p>
                <p className="text-xs text-muted-foreground mt-1">RKA has been notified. We'll review your details before your visit.</p>
              </div>
            )}

            {/* Tech mode: PDF + Save + Complete */}
            {!isCustomer && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={generatingPdf}
                    className="h-12 bg-muted rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Preview PDF
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="h-12 bg-muted rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </button>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  disabled={generatingPdf}
                  className="w-full h-12 bg-muted rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>

                {status !== 'completed' && (
                  <button
                    onClick={complete}
                    disabled={saving}
                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Complete Baseline
                  </button>
                )}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isCustomer ? (
        <div className="bg-primary px-4 py-3">
          <h1 className="text-base font-bold text-primary-foreground">RKA Industrial Solutions — Crane Culture & Performance Baseline</h1>
          <p className="text-xs text-primary-foreground/70">{customerSiteName || 'Pre-Visit Assessment'}</p>
        </div>
      ) : (
        <AppHeader
          title="Crane Culture Baseline"
          subtitle={site.name}
          onBack={onBack}
        />
      )}

      {/* Section tabs */}
      <div className="px-2 py-2 border-b border-border overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {SECTIONS.map((sec, idx) => (
            <button
              key={sec.id}
              onClick={() => setSectionIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                idx === sectionIdx
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section title + autosave indicator */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          {currentSection.label}
        </h2>
        {lastSaved && (
          <span className="text-[10px] text-muted-foreground">
            Saved {lastSaved.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-auto px-4 pb-32">
        {renderSection()}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 flex items-center gap-2 z-50">
        <button
          onClick={() => setSectionIdx(Math.max(0, sectionIdx - 1))}
          disabled={sectionIdx === 0}
          className="h-11 px-6 rounded-xl font-bold text-sm bg-muted text-foreground disabled:opacity-30 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setSectionIdx(Math.min(SECTIONS.length - 1, sectionIdx + 1))}
          disabled={sectionIdx === SECTIONS.length - 1}
          className="h-11 px-6 rounded-xl font-bold text-sm bg-primary text-primary-foreground disabled:opacity-30 flex items-center gap-1"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCustomer && (
        <PdfPreviewModal
          open={!!previewPdfDoc}
          pdfDoc={previewPdfDoc}
          title="Crane Baseline Report"
          onClose={() => setPreviewPdfDoc(null)}
          onDownload={() => {
            if (previewPdfDoc) {
              previewPdfDoc.save(`${str('company_name') || site.name}_Crane_Baseline_${new Date().toISOString().slice(0, 10)}.pdf`);
            }
          }}
        />
      )}
    </div>
  );
}
