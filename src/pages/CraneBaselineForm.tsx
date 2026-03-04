import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, CheckCircle, Loader2, Save, FileText } from 'lucide-react';
import { generateBaselinePdf } from '@/utils/generateBaselinePdf';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import type jsPDF from 'jspdf';

interface CraneBaselineFormProps {
  existingId?: string;
  onBack: () => void;
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

type FormData = Record<string, string | number | null>;

export default function CraneBaselineForm({ existingId, onBack }: CraneBaselineFormProps) {
  const { state } = useApp();
  const { toast } = useToast();
  const site = state.selectedSite!;

  const [sectionIdx, setSectionIdx] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState(existingId || '');
  const [status, setStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [previewPdfDoc, setPreviewPdfDoc] = useState<jsPDF | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Load existing
  useEffect(() => {
    if (!existingId) {
      // Pre-fill company name from site
      setFormData(prev => ({ ...prev, company_name: site.name }));
      return;
    }
    const load = async () => {
      const { data } = await supabase.from('crane_baselines').select('*').eq('id', existingId).single();
      if (data) {
        setStatus(data.status as any);
        const fd: FormData = {};
        Object.entries(data).forEach(([k, v]) => {
          if (!['id', 'created_at', 'updated_at', 'client_id'].includes(k) && v !== null) {
            fd[k] = v as any;
          }
        });
        setFormData(fd);
      }
    };
    load();
  }, [existingId]);

  const set = (key: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

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

    return {
      annualDowntime,
      reactiveRatio,
      mttr,
      costPerBreakdown,
      annualCost,
      adjustedCost,
      trainingCoverage,
    };
  }, [formData]);

  const save = async () => {
    setSaving(true);
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    const payload: any = {
      site_name: site.name,
      client_id: clientId,
      technician_id: state.currentUser?.id,
      technician_name: state.currentUser?.name,
      status,
      ...formData,
    };
    // Remove non-DB fields
    delete payload.status_label;

    try {
      if (recordId) {
        await supabase.from('crane_baselines').update(payload).eq('id', recordId);
      } else {
        const { data } = await supabase.from('crane_baselines').insert(payload).select('id').single();
        if (data) setRecordId(data.id);
      }
      toast({ title: 'Saved', description: 'Baseline saved successfully.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const complete = async () => {
    setStatus('completed');
    setSaving(true);
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    const payload: any = {
      site_name: site.name,
      client_id: clientId,
      technician_id: state.currentUser?.id,
      technician_name: state.currentUser?.name,
      status: 'completed',
      completed_at: new Date().toISOString(),
      ...formData,
    };

    try {
      if (recordId) {
        await supabase.from('crane_baselines').update(payload).eq('id', recordId);
      } else {
        const { data } = await supabase.from('crane_baselines').insert(payload).select('id').single();
        if (data) setRecordId(data.id);
      }
      toast({ title: 'Completed', description: 'Baseline completed and saved.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to complete.', variant: 'destructive' });
    }
    setSaving(false);
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
      });
      setPreviewPdfDoc(doc);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
    setGeneratingPdf(false);
  };

  // Render helpers
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
          className="flex-1 h-11 px-3 border border-border rounded-lg bg-background text-sm"
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
        className="w-full h-11 px-3 border border-border rounded-lg bg-background text-sm"
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
        className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none"
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
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              str(key) === opt
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground border border-border'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const renderCalcField = (label: string, value: number, prefix = '', suffix = '') => (
    <div className="bg-muted/50 border border-border rounded-xl p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">
        {prefix}{isNaN(value) || !isFinite(value) ? '—' : value.toLocaleString('en-AU', { maximumFractionDigits: 1 })}{suffix}
      </p>
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
              {renderCalcField('Estimated Annual Downtime', calc.annualDowntime, '', ' hours')}
              {renderCalcField('Reactive Maintenance Ratio', calc.reactiveRatio, '', '%')}
              {renderCalcField('Mean Time To Repair (MTTR)', calc.mttr, '', ' hours')}
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
              {renderCalcField('Estimated Cost Per Breakdown', calc.costPerBreakdown, '$')}
              {renderCalcField('Estimated Annual Downtime Cost', calc.annualCost, '$')}
              {str('backup_crane') === 'No' && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Adjusted Annual Downtime Cost (No Backup — 20% buffer)</p>
                  <p className="text-lg font-bold text-destructive">
                    ${isNaN(calc.adjustedCost) ? '—' : calc.adjustedCost.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
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
              {renderCalcField('Training Coverage Rate', calc.trainingCoverage, '', '%')}
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
            {renderNumberField('Average Response Time', 'provider_response_time', '0', 'hours')}
            {renderNumberField('First-Time Fix Rate', 'provider_fix_rate', '0', '%')}
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
                {renderCalcField('Annual Downtime', calc.annualDowntime, '', ' hrs')}
                {renderCalcField('Reactive Ratio', calc.reactiveRatio, '', '%')}
                {renderCalcField('MTTR', calc.mttr, '', ' hrs')}
                {renderCalcField('First-Time Fix', num('first_time_fix'), '', '%')}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">💰 Financial Exposure</h3>
              <div className="grid grid-cols-2 gap-3">
                {renderCalcField('Cost Per Breakdown', calc.costPerBreakdown, '$')}
                {renderCalcField('Annual Cost', calc.annualCost, '$')}
                {str('backup_crane') === 'No' && renderCalcField('Adjusted Cost', calc.adjustedCost, '$')}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">🎓 Education Indicator</h3>
              {renderCalcField('Training Coverage Rate', calc.trainingCoverage, '', '%')}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-foreground leading-relaxed">
                This assessment establishes your current crane performance baseline. During our onsite visit, we will review these findings and identify opportunities to reduce risk, downtime, and lifecycle cost.
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Crane Culture Baseline"
        subtitle={site.name}
        onBack={onBack}
      />

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

      {/* Section title */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-foreground">
          {currentSection.label}
        </h2>
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
    </div>
  );
}
