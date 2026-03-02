import { RepairFormData } from '@/pages/RepairBreakdownForm';

interface Props {
  formData: RepairFormData;
  updateForm: (updates: Partial<RepairFormData>) => void;
}

export function RepairSectionE({ formData, updateForm }: Props) {
  return (
    <div className="px-4 py-3 space-y-4">
      <p className="text-xs text-muted-foreground italic">These notes are internal only — not visible on the customer report. Use this section to capture improvement opportunities, lessons learned, or training observations.</p>
      <textarea
        placeholder="Internal notes (optional)…"
        value={formData.internal_note}
        onChange={e => updateForm({ internal_note: e.target.value })}
        className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
        rows={4}
      />
    </div>
  );
}
