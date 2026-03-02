import { useState } from 'react';
import { RepairFormData } from '@/pages/RepairBreakdownForm';
import { RepairButtonGroup } from './RepairButtonGroup';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  formData: RepairFormData;
  updateForm: (updates: Partial<RepairFormData>) => void;
}

const WORK_TYPES = ['Rectified (Permanent Repair)', 'Temporary Repair', 'Investigated Only', 'No Access / Could Not Proceed'];

const TESTING_CHECKLIST = [
  'Hoist operation verified',
  'Brake operation verified',
  'Upper & lower limits tested',
  'Long travel tested',
  'Cross travel tested',
  'Emergency stop tested',
  'Load test completed (if applicable)',
];

export function RepairSectionB({ formData, updateForm }: Props) {
  const addPart = () => {
    updateForm({ parts_data: [...formData.parts_data, { name: '', quantity: 1, part_number: '', photo_url: '' }] });
  };

  const updatePart = (idx: number, field: string, value: any) => {
    const updated = [...formData.parts_data];
    updated[idx] = { ...updated[idx], [field]: value };
    updateForm({ parts_data: updated });
  };

  const removePart = (idx: number) => {
    updateForm({ parts_data: formData.parts_data.filter((_, i) => i !== idx) });
  };

  const toggleChecklist = (item: string) => {
    const current = formData.functional_testing_checklist;
    const updated = current.includes(item) ? current.filter(c => c !== item) : [...current, item];
    updateForm({ functional_testing_checklist: updated });
  };

  const isRectified = formData.work_completed_type === 'Rectified (Permanent Repair)';
  const isTemporary = formData.work_completed_type === 'Temporary Repair';
  const isInvestigated = formData.work_completed_type === 'Investigated Only';
  const isNoAccess = formData.work_completed_type === 'No Access / Could Not Proceed';

  return (
    <div className="px-4 py-3 space-y-5">
      {/* Work Completed */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Work Completed *</label>
        <RepairButtonGroup options={WORK_TYPES} value={formData.work_completed_type} onChange={v => updateForm({ work_completed_type: v })} />
      </div>

      {/* Rectified fields */}
      {isRectified && (
        <>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Comment & Recommendation *</label>
            <textarea
              placeholder="Describe repair completed and corrective action taken…"
              value={formData.work_comment}
              onChange={e => updateForm({ work_comment: e.target.value })}
              className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
              rows={3}
            />
          </div>

          {/* Parts Replaced */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Parts Replaced?</label>
            <RepairButtonGroup
              options={['Yes', 'No']}
              value={formData.parts_replaced ? 'Yes' : 'No'}
              onChange={v => updateForm({ parts_replaced: v === 'Yes' })}
            />
          </div>

          {formData.parts_replaced && (
            <div className="space-y-3">
              {formData.parts_data.map((part, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Part {idx + 1}</span>
                    <button onClick={() => removePart(idx)} className="p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <input
                    placeholder="Part name *"
                    value={part.name}
                    onChange={e => updatePart(idx, 'name', e.target.value)}
                    className="w-full text-sm rounded-lg border border-border bg-background p-2"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={part.quantity}
                      onChange={e => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20 text-sm rounded-lg border border-border bg-background p-2"
                    />
                    <input
                      placeholder="Part number (optional)"
                      value={part.part_number}
                      onChange={e => updatePart(idx, 'part_number', e.target.value)}
                      className="flex-1 text-sm rounded-lg border border-border bg-background p-2"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addPart}
                className="w-full py-2.5 rounded-lg border border-dashed border-border text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Part
              </button>
            </div>
          )}

          {/* Functional Testing */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Functional Testing Completed?</label>
            <p className="text-xs text-muted-foreground italic mb-2">Optional — use as a training checklist or fill out if applicable.</p>
            <RepairButtonGroup
              options={['Yes', 'No', 'N/A']}
              value={formData.functional_testing_completed}
              onChange={v => updateForm({ functional_testing_completed: v })}
            />
          </div>

          {formData.functional_testing_completed === 'Yes' && (
            <div className="space-y-1.5">
              {TESTING_CHECKLIST.map(item => {
                const checked = formData.functional_testing_checklist.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => toggleChecklist(item)}
                    className={`w-full text-left p-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all ${
                      checked ? 'bg-primary/5 border border-primary' : 'bg-muted border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {checked && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    {item}
                  </button>
                );
              })}
            </div>
          )}

          {formData.functional_testing_completed === 'No' && (
            <textarea
              placeholder="Explain why testing was not completed…"
              value={formData.functional_testing_explanation}
              onChange={e => updateForm({ functional_testing_explanation: e.target.value })}
              className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
              rows={2}
            />
          )}
        </>
      )}

      {/* Temporary Repair fields */}
      {isTemporary && (
        <>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Comment & Recommendation *</label>
            <textarea
              placeholder="Describe temporary repair and recommended follow-up…"
              value={formData.work_comment}
              onChange={e => updateForm({ work_comment: e.target.value })}
              className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Follow-up Required?</label>
            <RepairButtonGroup
              options={['Yes', 'No']}
              value={formData.followup_required ? 'Yes' : 'No'}
              onChange={v => updateForm({ followup_required: v === 'Yes' })}
            />
          </div>

          {formData.followup_required && (
            <input
              type="date"
              value={formData.followup_date}
              onChange={e => updateForm({ followup_date: e.target.value })}
              className="w-full text-sm rounded-lg border border-border bg-background p-3"
            />
          )}
        </>
      )}

      {/* Investigated Only */}
      {isInvestigated && (
        <>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Diagnosis Summary *</label>
            <textarea
              placeholder="Describe root cause and findings…"
              value={formData.diagnosis_summary}
              onChange={e => updateForm({ diagnosis_summary: e.target.value })}
              className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Recommendation *</label>
            <textarea
              placeholder="Recommended next steps…"
              value={formData.recommendation}
              onChange={e => updateForm({ recommendation: e.target.value })}
              className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
              rows={2}
            />
          </div>
        </>
      )}

      {/* No Access */}
      {isNoAccess && (
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Reason *</label>
          <textarea
            placeholder="Explain why access was not possible…"
            value={formData.no_access_reason}
            onChange={e => updateForm({ no_access_reason: e.target.value })}
            className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
