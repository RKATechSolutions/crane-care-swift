import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, CheckCircle, Loader2, Save, FileText, Sparkles, Send } from 'lucide-react';
import { generateBaselinePdf } from '@/utils/generateBaselinePdf';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import type jsPDF from 'jspdf';

interface CraneBaselineFormProps {
  existingId?: string;
  onBack: () => void;
  mode?: 'technician' | 'customer';
  customerSiteName?: string;
}

const SECTIONS = [
  { id: 'site_ops', label: 'Site & Ops' },
  { id: 'breakdown', label: 'Breakdowns' },
  { id: 'financial', label: 'Financial' },
  { id: 'environment', label: 'Environment' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'safety', label: 'Safety' },
  { id: 'training', label: 'Training' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'provider', label: 'Provider' },
  { id: 'summary', label: 'Summary' },
];

const YES_PARTIAL_NO = ['Yes', 'Partially', 'No'];
const YES_SOMEWHAT_NO = ['Yes', 'Somewhat', 'No'];

// Fields that are answered by the customer (pre-visit sections)
const CUSTOMER_FIELDS = new Set([
  'company_name', 'site_location', 'main_contact_name', 'role_position',
  'number_of_cranes', 'operating_hours_per_day', 'shifts_per_day', 'days_per_week',
  'production_increased', 'breakdowns', 'avg_downtime', 'longest_downtime',
  'avg_response_time', 'scheduled_visits', 'emergency_visits', 'first_time_fix',
  'top_recurring_issues', 'rev_hour', 'labour_cost_per_hour', 'backup_crane',
  'value_most', 'most_frustrating', 'magic_wand',
]);

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

    return { annualDowntime, reactiveRatio, mttr, costPerBreakdown, annualCost, adjustedCost, trainingCoverage };
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
      const doc = await generateBaselinePdf({
        siteName: site.name,
        companyName: str('company_name'),
        technicianName: state.currentUser?.name || '',
        formData,
        calculations: calc,
        aiSummary: aiSummary || undefined,
      });
      setPreviewPdfDoc(doc);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
    setGeneratingPdf(false);
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

  const currentSection = SECTIONS[sectionIdx];

  const renderSection = () => {
    switch (currentSection.id) {
      case 'site_ops':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2">
              <p className="text-xs text-muted-foreground">Complete before our onsite visit to speed up your strategic review.</p>
            </div>
            {renderTextField('Company Name', 'company_name', true)}
            {renderTextField('Site Location', 'site_location')}
            {renderTextField('Main Contact Name', 'main_contact_name')}
            {renderTextField('Role / Position', 'role_position')}
            {renderNumberField('Number of Cranes Onsite', 'number_of_cranes')}
            {renderNumberField('Operating Hours per Day', 'operating_hours_per_day')}
            {renderNumberField('Shifts per Day', 'shifts_per_day')}
            {renderNumberField('Days per Week', 'days_per_week')}
            {renderSelect('Has production increased in the last 3–5 years?', 'production_increased', ['No', 'Slightly', 'Significantly'])}
          </div>
        );

      case 'breakdown':
        return (
          <div className="space-y-4">
            {renderNumberField('Total Crane Breakdowns (Last 12 Months)', 'breakdowns')}
            {renderNumberField('Average Downtime per Breakdown', 'avg_downtime', '0', 'hours')}
            {renderNumberField('Longest Downtime Event', 'longest_downtime', '0', 'hours')}
            {renderNumberField('Average Technician Response Time', 'avg_response_time', '0', 'hours')}
            {renderNumberField('Scheduled Maintenance Visits per Year', 'scheduled_visits')}
            {renderNumberField('Emergency Call-Outs per Year', 'emergency_visits')}
            {renderNumberField('First-Time Fix Rate', 'first_time_fix', '0', '%')}
            {renderTextArea('Top 3 Recurring Crane Issues', 'top_recurring_issues')}
            
            <div className="pt-2 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Calculated Metrics</p>
              {renderCalcField('Estimated Annual Downtime', calc.annualDowntime, '', ' hours', 'Total hours your cranes are out of action each year based on breakdown frequency and average repair time.')}
              {renderCalcField('Reactive Maintenance Ratio', calc.reactiveRatio, '', '%', 'Percentage of maintenance that is unplanned. Above 50% indicates a reactive maintenance culture.')}
              {renderCalcField('Mean Time To Repair', calc.mttr, '', ' hours', 'Average time from breakdown to crane back in service. Lower is better — industry benchmark is under 4 hours.')}
            </div>
          </div>
        );

      case 'financial':
        return (
          <div className="space-y-4">
            {renderNumberField('Revenue Generated per Production Hour', 'rev_hour', '0', '$')}
            {renderNumberField('Labour Cost per Downtime Hour', 'labour_cost_per_hour', '0', '$')}
            {renderSelect('Backup Crane Available?', 'backup_crane', ['Yes', 'No'])}

            <div className="pt-2 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Financial Impact</p>
              {renderCalcField('Estimated Cost Per Breakdown', calc.costPerBreakdown, '$', '', 'Revenue lost each time a crane breaks down, based on your hourly production value.')}
              {renderCalcField('Estimated Annual Downtime Cost', calc.annualCost, '$', '', 'Total annual revenue lost due to crane downtime across all breakdowns.')}
              {str('backup_crane') === 'No' && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Adjusted Annual Downtime Cost (No Backup — 20% buffer)</p>
                  <p className="text-lg font-bold text-destructive">
                    ${isNaN(calc.adjustedCost) ? '—' : calc.adjustedCost.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                    Without a backup crane, downtime impact increases by ~20% due to production bottlenecks, overtime costs, and delivery penalties.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'environment':
        return (
          <div className="space-y-4">
            {renderSelect('Clear standard for crane area cleanliness?', 'cleanliness_standard', YES_SOMEWHAT_NO)}
            {renderSelect('Workshop consistently tidy and organised?', 'workshop_tidy', YES_SOMEWHAT_NO)}
            {renderSelect('Environmental factors actively managed?', 'environmental_factors', YES_SOMEWHAT_NO)}
            {renderSelect('Crane hazards discussed in safety meetings?', 'crane_hazards_meetings', YES_SOMEWHAT_NO)}
          </div>
        );

      case 'maintenance':
        return (
          <div className="space-y-4">
            {renderSelect('Documented breakdown response process?', 'breakdown_response_process', YES_PARTIAL_NO)}
            {renderSelect('Preventative maintenance adhered to?', 'preventative_maintenance', YES_PARTIAL_NO)}
            {renderSelect('Pre-start inspections consistently completed?', 'pre_start_inspections', YES_PARTIAL_NO)}
            {renderSelect('Logbooks regularly updated?', 'logbooks_updated', YES_PARTIAL_NO)}
            {renderSelect('Inspection findings reviewed by management?', 'findings_reviewed', YES_PARTIAL_NO)}
            {renderSelect('Defects tracked to close-out?', 'defects_tracked', YES_PARTIAL_NO)}
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-4">
            {renderSelect('Walkways clear and unobstructed?', 'walkways_clear', YES_PARTIAL_NO)}
            {renderSelect('Signage current and visible?', 'signage_current', YES_PARTIAL_NO)}
            {renderSelect('PPE consistently worn?', 'ppe_worn', YES_PARTIAL_NO)}
            {renderSelect('Operating within rated capacity?', 'within_capacity', YES_PARTIAL_NO)}
            {renderSelect('Lifting equipment register maintained?', 'lifting_register_maintained', YES_PARTIAL_NO)}
            {renderSelect('Workers educated on load handling?', 'load_handling_education', YES_PARTIAL_NO)}
            {renderSelect('Formal process for complex lifts?', 'complex_lifts_process', YES_PARTIAL_NO)}
          </div>
        );

      case 'training':
        return (
          <div className="space-y-4">
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

      case 'engineering':
        return (
          <div className="space-y-4">
            {renderSelect('Design Work Period calculated?', 'design_work_period', YES_PARTIAL_NO)}
            {renderSelect('Remaining service life known?', 'remaining_service_life', YES_PARTIAL_NO)}
            {renderSelect('Digital monitoring installed?', 'digital_monitoring', YES_PARTIAL_NO)}
            {renderSelect('2–5 year capital forecast exists?', 'capital_forecast', YES_PARTIAL_NO)}
            {renderSelect('Duty classification reassessed since production growth?', 'duty_classification_reassessed', YES_PARTIAL_NO)}
          </div>
        );

      case 'provider':
        return (
          <div className="space-y-4">
            {renderSelect('Reports electronic & detailed?', 'reports_electronic', YES_PARTIAL_NO)}
            {renderSelect('Reports include risk ranking?', 'reports_risk_ranking', YES_PARTIAL_NO)}
            {renderSelect('Engineering advice provided?', 'engineering_advice', YES_PARTIAL_NO)}
            {renderSelect('Lifecycle planning discussed annually?', 'lifecycle_planning', YES_PARTIAL_NO)}
            {renderTextArea('What do you value most about your current provider?', 'value_most')}
            {renderTextArea('What has been most frustrating?', 'most_frustrating')}
            {renderTextArea('If you had a magic wand, what would you improve?', 'magic_wand')}
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">🏗 Reliability Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {renderCalcField('Annual Downtime', calc.annualDowntime, '', ' hrs', 'Total crane downtime per year from all breakdowns.')}
                {renderCalcField('Reactive Ratio', calc.reactiveRatio, '', '%', 'Share of maintenance that is unplanned emergency work.')}
                {renderCalcField('Mean Time To Repair', calc.mttr, '', ' hrs', 'Average hours from breakdown to crane back in service.')}
                {renderCalcField('First-Time Fix', num('first_time_fix'), '', '%', 'How often issues are resolved on the first visit.')}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">💰 Financial Exposure</h3>
              <div className="grid grid-cols-2 gap-3">
                {renderCalcField('Cost Per Breakdown', calc.costPerBreakdown, '$', '', 'Revenue lost each time a crane goes down.')}
                {renderCalcField('Annual Cost', calc.annualCost, '$', '', 'Total yearly revenue impact from all crane downtime.')}
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

            {/* Tech mode: PDF + Complete */}
            {!isCustomer && (
              <div className="flex gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={generatingPdf}
                  className="flex-1 h-12 bg-foreground text-background rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Export PDF
                </button>
                {status !== 'completed' && (
                  <button
                    onClick={complete}
                    disabled={saving}
                    className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Complete
                  </button>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isCustomer ? (
        <div className="bg-primary px-4 py-3">
          <h1 className="text-base font-bold text-primary-foreground">RKA Crane Culture & Performance Baseline</h1>
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
          className="h-11 px-4 rounded-xl font-bold text-sm bg-muted text-foreground disabled:opacity-30 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <button
          onClick={save}
          disabled={saving}
          className="h-11 px-4 rounded-xl font-bold text-sm bg-accent text-accent-foreground flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setSectionIdx(Math.min(SECTIONS.length - 1, sectionIdx + 1))}
          disabled={sectionIdx === SECTIONS.length - 1}
          className="h-11 px-4 rounded-xl font-bold text-sm bg-primary text-primary-foreground disabled:opacity-30 flex items-center gap-1"
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
