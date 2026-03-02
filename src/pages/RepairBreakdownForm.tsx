import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RepairSectionA } from '@/components/repair/RepairSectionA';
import { RepairSectionB } from '@/components/repair/RepairSectionB';
import { RepairSectionC } from '@/components/repair/RepairSectionC';
import { RepairSectionD } from '@/components/repair/RepairSectionD';
import { RepairSectionE } from '@/components/repair/RepairSectionE';
import { RepairSubmitSummary } from '@/components/repair/RepairSubmitSummary';

export interface RepairFormData {
  // Section A
  job_type: string | null;
  fault_source: string | null;
  linked_defect_ids: string[];
  asset_status_on_arrival: string | null;
  arrival_status_comment: string;
  arrival_status_photos: string[];
  urgency_assessment: string | null;
  customer_reported_issue: string;
  // Section B
  work_completed_type: string | null;
  work_comment: string;
  parts_replaced: boolean;
  parts_data: { name: string; quantity: number; part_number: string; photo_url: string }[];
  functional_testing_completed: string | null;
  functional_testing_checklist: string[];
  functional_testing_explanation: string;
  followup_required: boolean;
  followup_date: string;
  diagnosis_summary: string;
  recommendation: string;
  no_access_reason: string;
  no_access_photos: string[];
  // Section C
  defect_closures: {
    defect_id: string;
    status: string;
    resolution_comment: string;
    resolution_photo_urls: string[];
    verification_type: string;
    update_comment: string;
  }[];
  // Section D
  return_to_service: string | null;
  return_to_service_explanation: string;
  return_to_service_photos: string[];
  // Section E
  internal_note: string;
  internal_photos: string[];
}

interface RepairBreakdownFormProps {
  assetName: string;
  assetId?: string;
  clientId?: string;
  siteName?: string;
  onBack: () => void;
}

const initialFormData: RepairFormData = {
  job_type: null,
  fault_source: null,
  linked_defect_ids: [],
  asset_status_on_arrival: null,
  arrival_status_comment: '',
  arrival_status_photos: [],
  urgency_assessment: null,
  customer_reported_issue: '',
  work_completed_type: null,
  work_comment: '',
  parts_replaced: false,
  parts_data: [],
  functional_testing_completed: null,
  functional_testing_checklist: [],
  functional_testing_explanation: '',
  followup_required: false,
  followup_date: '',
  diagnosis_summary: '',
  recommendation: '',
  no_access_reason: '',
  no_access_photos: [],
  defect_closures: [],
  return_to_service: null,
  return_to_service_explanation: '',
  return_to_service_photos: [],
  internal_note: '',
  internal_photos: [],
};

type SectionKey = 'a' | 'b' | 'c' | 'd' | 'e';

export default function RepairBreakdownForm({
  assetName, assetId, clientId, siteName, onBack
}: RepairBreakdownFormProps) {
  const { state } = useApp();
  const [formData, setFormData] = useState<RepairFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    a: true, b: false, c: false, d: false, e: false,
  });

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateForm = useCallback((updates: Partial<RepairFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const showDefectClosure = formData.fault_source === 'Inspection Defect' && formData.linked_defect_ids.length > 0;

  // Calculate admin alert reasons
  const getAlertReasons = (): string[] => {
    const reasons: string[] = [];
    if (formData.urgency_assessment === 'Immediate – Unsafe') reasons.push('Immediate urgency');
    if (formData.work_completed_type === 'Temporary Repair') reasons.push('Temporary repair');
    if (formData.return_to_service === 'No – Remains Isolated') reasons.push('Crane not returned to service');
    if (formData.followup_required) reasons.push('Follow-up required');
    const unresolvedImmediate = formData.defect_closures.some(
      dc => dc.status === 'Still Unresolved'
    );
    if (unresolvedImmediate) reasons.push('Defect remains unresolved');
    return reasons;
  };

  const isCritical = getAlertReasons().length > 0;

  const saveRepairJob = async (status: string = 'Draft') => {
    setSaving(true);
    try {
      const alertReasons = getAlertReasons();
      const { error } = await supabase.from('repair_jobs').insert({
        asset_id: assetId || null,
        asset_name: assetName,
        client_id: clientId || null,
        site_name: siteName || null,
        technician_id: state.currentUser?.id || 'unknown',
        technician_name: state.currentUser?.name || 'Unknown',
        status,
        job_type: formData.job_type,
        fault_source: formData.fault_source,
        linked_defect_ids: formData.linked_defect_ids,
        asset_status_on_arrival: formData.asset_status_on_arrival,
        arrival_status_comment: formData.arrival_status_comment,
        arrival_status_photos: formData.arrival_status_photos,
        urgency_assessment: formData.urgency_assessment,
        customer_reported_issue: formData.customer_reported_issue,
        work_completed_type: formData.work_completed_type,
        work_comment: formData.work_comment,
        parts_replaced: formData.parts_replaced,
        parts_data: formData.parts_data as any,
        functional_testing_completed: formData.functional_testing_completed,
        functional_testing_checklist: formData.functional_testing_checklist as any,
        functional_testing_explanation: formData.functional_testing_explanation,
        followup_required: formData.followup_required,
        followup_date: formData.followup_date || null,
        diagnosis_summary: formData.diagnosis_summary,
        recommendation: formData.recommendation,
        no_access_reason: formData.no_access_reason,
        no_access_photos: formData.no_access_photos,
        defect_closures: formData.defect_closures as any,
        return_to_service: formData.return_to_service,
        return_to_service_explanation: formData.return_to_service_explanation,
        internal_note: formData.internal_note,
        internal_photos: formData.internal_photos,
        admin_alert_triggered: alertReasons.length > 0,
        admin_alert_reasons: alertReasons,
      } as any);

      if (error) throw error;
      toast.success(status === 'Submitted' ? 'Repair job submitted!' : 'Draft saved');
      if (status === 'Submitted') onBack();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (isCritical) {
      setShowSummary(true);
    } else {
      saveRepairJob('Submitted');
    }
  };

  const sectionHeader = (key: SectionKey, label: string, subtitle?: string) => (
    <button
      onClick={() => toggleSection(key)}
      className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border"
    >
      <div className="text-left">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{label}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {expandedSections[key] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={assetName}
        subtitle="Repairs & Breakdowns"
        onBack={onBack}
      />

      {/* Urgency banner */}
      {formData.urgency_assessment === 'Immediate – Unsafe' && (
        <div className="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-bold text-center">
          ⚠️ IMMEDIATE — UNSAFE CONDITION
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {/* Section A — Quick Start (always visible initially) */}
        {sectionHeader('a', 'A — Quick Start', 'Job type, urgency & fault details')}
        {expandedSections.a && (
          <RepairSectionA
            formData={formData}
            updateForm={updateForm}
            assetId={assetId}
          />
        )}

        {/* Section B — Work Completed */}
        {sectionHeader('b', 'B — Work Completed', 'Repair details & parts')}
        {expandedSections.b && (
          <RepairSectionB formData={formData} updateForm={updateForm} />
        )}

        {/* Section C — Defect Closure (conditional) */}
        {showDefectClosure && (
          <>
            {sectionHeader('c', 'C — Defect Closure', `${formData.linked_defect_ids.length} defect(s) selected`)}
            {expandedSections.c && (
              <RepairSectionC formData={formData} updateForm={updateForm} />
            )}
          </>
        )}

        {/* Section D — Return to Service */}
        {sectionHeader('d', 'D — Return to Service')}
        {expandedSections.d && (
          <RepairSectionD formData={formData} updateForm={updateForm} />
        )}

        {/* Section E — Internal Notes */}
        {sectionHeader('e', 'E — Internal Notes', 'Not shown on customer report')}
        {expandedSections.e && (
          <RepairSectionE formData={formData} updateForm={updateForm} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2 bg-background">
        <button
          onClick={() => saveRepairJob('Draft')}
          disabled={saving}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !formData.job_type}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <CheckCircle className="w-5 h-5" />
          Submit Repair Job
        </button>
      </div>

      {/* Summary / Confirmation Dialog */}
      {showSummary && (
        <RepairSubmitSummary
          formData={formData}
          alertReasons={getAlertReasons()}
          onConfirm={() => {
            setShowSummary(false);
            saveRepairJob('Submitted');
          }}
          onCancel={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
