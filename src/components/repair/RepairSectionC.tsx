import { useState, useEffect } from 'react';
import { RepairFormData } from '@/pages/RepairBreakdownForm';
import { RepairButtonGroup } from './RepairButtonGroup';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  formData: RepairFormData;
  updateForm: (updates: Partial<RepairFormData>) => void;
}

interface DefectDetail {
  id: string;
  question_text: string;
  urgency: string | null;
  comment: string | null;
  created_at: string;
}

const VERIFICATION_TYPES = ['Witnessed repair', 'Customer confirmed repair', 'Not verified (admin review)'];

export function RepairSectionC({ formData, updateForm }: Props) {
  const [defectDetails, setDefectDetails] = useState<DefectDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      if (formData.linked_defect_ids.length === 0) { setLoading(false); return; }

      const { data: responses } = await supabase
        .from('inspection_responses')
        .select('id, question_id, urgency, comment, created_at')
        .in('id', formData.linked_defect_ids);

      if (responses) {
        const qIds = [...new Set(responses.map(r => r.question_id))];
        const { data: questions } = await supabase
          .from('question_library')
          .select('question_id, question_text')
          .in('question_id', qIds);
        const qMap = Object.fromEntries((questions || []).map(q => [q.question_id, q.question_text]));

        setDefectDetails(responses.map(r => ({
          id: r.id,
          question_text: qMap[r.question_id] || r.question_id,
          urgency: r.urgency,
          comment: r.comment,
          created_at: r.created_at,
        })));
      }

      // Initialize closures if not already
      if (formData.defect_closures.length === 0) {
        const closures = formData.linked_defect_ids.map(id => ({
          defect_id: id,
          status: '',
          resolution_comment: '',
          resolution_photo_urls: [],
          verification_type: '',
          update_comment: '',
        }));
        updateForm({ defect_closures: closures });
      }

      setLoading(false);
    };
    loadDetails();
  }, [formData.linked_defect_ids]);

  const updateClosure = (defectId: string, updates: Partial<RepairFormData['defect_closures'][0]>) => {
    const updated = formData.defect_closures.map(dc =>
      dc.defect_id === defectId ? { ...dc, ...updates } : dc
    );
    updateForm({ defect_closures: updated });
  };

  if (loading) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">Loading defect details…</div>;
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {defectDetails.map(defect => {
        const closure = formData.defect_closures.find(dc => dc.defect_id === defect.id);
        if (!closure) return null;

        return (
          <div key={defect.id} className="border border-border rounded-xl p-4 space-y-3">
            <div>
              <p className="font-bold text-sm">{defect.question_text}</p>
              <div className="flex items-center gap-2 mt-1">
                {defect.urgency && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    defect.urgency === 'Immediate' ? 'bg-destructive/10 text-destructive' :
                    defect.urgency === 'Urgent' ? 'bg-rka-orange/10 text-rka-orange' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {defect.urgency}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{new Date(defect.created_at).toLocaleDateString()}</span>
              </div>
              {defect.comment && <p className="text-xs text-muted-foreground mt-1">{defect.comment}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Status Update *</label>
              <RepairButtonGroup
                options={['Resolved', 'Still Unresolved']}
                value={closure.status}
                onChange={v => updateClosure(defect.id, { status: v || '' })}
                colorMap={{ 'Resolved': 'bg-rka-green text-primary-foreground', 'Still Unresolved': 'bg-rka-orange text-destructive-foreground' }}
              />
            </div>

            {/* Resolved fields */}
            {closure.status === 'Resolved' && (
              <>
                <textarea
                  placeholder="Resolution comment *"
                  value={closure.resolution_comment}
                  onChange={e => updateClosure(defect.id, { resolution_comment: e.target.value })}
                  className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
                  rows={2}
                />
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Verification *</label>
                  <RepairButtonGroup
                    options={VERIFICATION_TYPES}
                    value={closure.verification_type}
                    onChange={v => updateClosure(defect.id, { verification_type: v || '' })}
                  />
                </div>
              </>
            )}

            {/* Still Unresolved fields */}
            {closure.status === 'Still Unresolved' && (
              <textarea
                placeholder="Update comment (optional)"
                value={closure.update_comment}
                onChange={e => updateClosure(defect.id, { update_comment: e.target.value })}
                className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
                rows={2}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
