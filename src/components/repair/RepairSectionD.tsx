import { RepairFormData } from '@/pages/RepairBreakdownForm';
import { RepairButtonGroup } from './RepairButtonGroup';

interface Props {
  formData: RepairFormData;
  updateForm: (updates: Partial<RepairFormData>) => void;
}

const RETURN_OPTIONS = ['Yes – Fully Operational', 'Yes – Restricted Operation', 'No – Remains Isolated'];

const COLOR_MAP: Record<string, string> = {
  'Yes – Fully Operational': 'bg-rka-green text-primary-foreground',
  'No – Remains Isolated': 'bg-destructive text-destructive-foreground',
};

export function RepairSectionD({ formData, updateForm }: Props) {
  const needsExplanation = formData.return_to_service === 'Yes – Restricted Operation' || formData.return_to_service === 'No – Remains Isolated';

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Crane Returned to Service? *</label>
        <RepairButtonGroup
          options={RETURN_OPTIONS}
          value={formData.return_to_service}
          onChange={v => updateForm({ return_to_service: v })}
          colorMap={COLOR_MAP}
        />
      </div>

      {needsExplanation && (
        <textarea
          placeholder="Explain the restriction or isolation reason…"
          value={formData.return_to_service_explanation}
          onChange={e => updateForm({ return_to_service_explanation: e.target.value })}
          className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
          rows={3}
        />
      )}
    </div>
  );
}
