import { RepairFormData } from '@/pages/RepairBreakdownForm';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  formData: RepairFormData;
  alertReasons: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function RepairSubmitSummary({ formData, alertReasons, onConfirm, onCancel }: Props) {
  const resolvedCount = formData.defect_closures.filter(dc => dc.status === 'Resolved').length;
  const openCount = formData.defect_closures.filter(dc => dc.status === 'Still Unresolved').length;

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-6 h-6 text-rka-orange" />
          <h3 className="text-lg font-bold">Confirm Submission</h3>
        </div>

        {/* Summary card */}
        <div className="space-y-2 text-sm">
          <SummaryRow label="Job Type" value={formData.job_type} />
          <SummaryRow label="Urgency" value={formData.urgency_assessment} />
          <SummaryRow label="Work Completed" value={formData.work_completed_type} />
          <SummaryRow label="Parts Replaced" value={formData.parts_data.length > 0 ? `${formData.parts_data.length}` : 'None'} />
          <SummaryRow label="Testing" value={formData.functional_testing_completed || 'N/A'} />
          {formData.defect_closures.length > 0 && (
            <>
              <SummaryRow label="Defects Resolved" value={`${resolvedCount}`} />
              <SummaryRow label="Defects Still Open" value={`${openCount}`} />
            </>
          )}
          <SummaryRow label="Return to Service" value={formData.return_to_service} />
        </div>

        {/* Alert warnings */}
        {alertReasons.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-1">
            <p className="text-xs font-bold text-destructive uppercase">Admin Alerts Will Be Triggered:</p>
            {alertReasons.map((r, i) => (
              <p key={i} className="text-xs text-destructive">• {r}</p>
            ))}
          </div>
        )}

        <button
          onClick={onConfirm}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Confirm & Submit
        </button>
        <button
          onClick={onCancel}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value || '—'}</span>
    </div>
  );
}
