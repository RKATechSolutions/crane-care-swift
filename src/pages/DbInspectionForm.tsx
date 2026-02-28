import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { StandardQuestionBlock, QuestionConfig, ResponseData } from '@/components/StandardQuestionBlock';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { supabase } from '@/integrations/supabase/client';
import { Save, CheckCircle, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DbInspectionFormProps {
  formId: string;
  assetName: string;
  assetId?: string;
  clientId?: string;
  siteName?: string;
  existingInspectionId?: string;
  onBack: () => void;
}

interface FormQuestion extends QuestionConfig {
  override_sort_order: number | null;
  section_override: string | null;
}

export default function DbInspectionForm({
  formId, assetName, assetId, clientId, siteName, existingInspectionId, onBack
}: DbInspectionFormProps) {
  const { state } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseData>>({});
  const [inspectionId, setInspectionId] = useState<string | null>(existingInspectionId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [formName, setFormName] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Load questions for this form
  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);

      // Get form name
      const { data: formData } = await supabase
        .from('form_templates')
        .select('form_name')
        .eq('form_id', formId)
        .single();
      if (formData) setFormName(formData.form_name);

      // Get questions via bridge table
      const { data: bridgeData } = await supabase
        .from('form_template_questions')
        .select('question_id, required, override_sort_order, override_help_text, override_standard_ref, section_override')
        .eq('form_id', formId)
        .order('override_sort_order');

      if (!bridgeData || bridgeData.length === 0) {
        setLoading(false);
        return;
      }

      const questionIds = bridgeData.map(b => b.question_id);
      const { data: questionData } = await supabase
        .from('question_library')
        .select('*')
        .in('question_id', questionIds)
        .eq('active', true);

      if (!questionData) {
        setLoading(false);
        return;
      }

      // Merge bridge overrides with question data
      const merged: FormQuestion[] = bridgeData.map(bridge => {
        const q = questionData.find(qd => qd.question_id === bridge.question_id);
        if (!q) return null;
        return {
          question_id: q.question_id,
          question_text: q.question_text,
          help_text: bridge.override_help_text || q.help_text,
          standard_ref: bridge.override_standard_ref || q.standard_ref,
          answer_type: q.answer_type,
          options: q.options,
          requires_photo_on_fail: q.requires_photo_on_fail,
          requires_comment_on_fail: q.requires_comment_on_fail,
          severity_required_on_fail: q.severity_required_on_fail,
          required: bridge.required,
          section: bridge.section_override || q.section,
          override_sort_order: bridge.override_sort_order,
          section_override: bridge.section_override,
        };
      }).filter(Boolean) as FormQuestion[];

      setQuestions(merged);

      // Initialize empty responses
      const initResponses: Record<string, ResponseData> = {};
      merged.forEach(q => {
        initResponses[q.question_id] = {
          question_id: q.question_id,
          answer_value: null,
          pass_fail_status: null,
          severity: null,
          comment: null,
          photo_urls: [],
          defect_flag: false,
        };
      });

      // If existing inspection, load saved responses
      if (existingInspectionId) {
        const { data: savedResponses } = await supabase
          .from('inspection_responses')
          .select('*')
          .eq('inspection_id', existingInspectionId);

        if (savedResponses) {
          savedResponses.forEach(sr => {
            initResponses[sr.question_id] = {
              question_id: sr.question_id,
              answer_value: sr.answer_value,
              pass_fail_status: sr.pass_fail_status,
              severity: sr.severity,
              comment: sr.comment,
              photo_urls: sr.photo_urls || [],
              defect_flag: sr.defect_flag,
            };
          });
        }
      }

      setResponses(initResponses);
      setLoading(false);
    };

    loadForm();
  }, [formId, existingInspectionId]);

  // Group questions by section
  const sections = useMemo(() => {
    const sectionMap: Record<string, FormQuestion[]> = {};
    const sectionOrder: string[] = [];
    questions.forEach(q => {
      if (!sectionMap[q.section]) {
        sectionMap[q.section] = [];
        sectionOrder.push(q.section);
      }
      sectionMap[q.section].push(q);
    });
    return sectionOrder.map(name => ({
      name,
      questions: sectionMap[name].sort((a, b) => (a.override_sort_order || 0) - (b.override_sort_order || 0)),
    }));
  }, [questions]);

  const currentSection = sections[currentSectionIdx];

  // Stats
  const totalAnswered = Object.values(responses).filter(r => r.answer_value || r.pass_fail_status).length;
  const totalQuestions = questions.length;
  const defectCount = Object.values(responses).filter(r => r.defect_flag).length;

  const handleResponseUpdate = useCallback((questionId: string, response: ResponseData) => {
    setResponses(prev => ({ ...prev, [questionId]: response }));
  }, []);

  const handleSectionChange = useCallback((idx: number) => {
    setCurrentSectionIdx(idx);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Pass All checklist items in current section
  const handlePassAll = useCallback(() => {
    if (!currentSection) return;
    const updates = { ...responses };
    currentSection.questions.forEach(q => {
      if (q.answer_type === 'PassFailNA' && !updates[q.question_id]?.pass_fail_status) {
        updates[q.question_id] = {
          ...updates[q.question_id],
          pass_fail_status: 'Pass',
          answer_value: 'Pass',
          defect_flag: false,
        };
      }
    });
    setResponses(updates);
  }, [currentSection, responses]);

  const hasChecklistItems = currentSection?.questions.some(q => q.answer_type === 'PassFailNA') || false;
  const allChecklistPassed = currentSection?.questions
    .filter(q => q.answer_type === 'PassFailNA')
    .every(q => responses[q.question_id]?.pass_fail_status === 'Pass') || false;

  // Save to database
  const saveInspection = async (status: string = 'Draft') => {
    setSaving(true);
    try {
      let currentInspId = inspectionId;

      if (!currentInspId) {
        // Create inspection record
        const { data: newInsp, error } = await supabase
          .from('db_inspections')
          .insert({
            form_id: formId,
            client_id: clientId || null,
            site_name: siteName || null,
            asset_id: assetId || null,
            asset_name: assetName,
            technician_id: state.currentUser?.id || 'unknown',
            technician_name: state.currentUser?.name || 'Unknown',
            status,
          })
          .select('id')
          .single();

        if (error) throw error;
        currentInspId = newInsp.id;
        setInspectionId(currentInspId);
      } else {
        // Update status
        await supabase
          .from('db_inspections')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', currentInspId);
      }

      // Upsert all responses
      const responseRows = Object.values(responses)
        .filter(r => r.answer_value || r.pass_fail_status || r.photo_urls.length > 0)
        .map(r => ({
          inspection_id: currentInspId!,
          question_id: r.question_id,
          answer_value: r.answer_value,
          pass_fail_status: r.pass_fail_status,
          severity: r.severity,
          comment: r.comment,
          photo_urls: r.photo_urls,
          defect_flag: r.defect_flag,
          updated_at: new Date().toISOString(),
        }));

      if (responseRows.length > 0) {
        const { error: respError } = await supabase
          .from('inspection_responses')
          .upsert(responseRows, { onConflict: 'inspection_id,question_id' });
        if (respError) throw respError;
      }

      toast.success(status === 'Submitted' ? 'Inspection submitted!' : 'Progress saved');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading form…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title={formName} subtitle="No questions found" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
          <p>No questions configured for this form template.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={assetName}
        subtitle={`${formName} • ${totalAnswered}/${totalQuestions}`}
        onBack={onBack}
        onNoteToAdmin={() => setNoteOpen(true)}
      />

      <ProgressBar
        currentSection={currentSectionIdx}
        totalSections={sections.length}
        sectionNames={sections.map(s => s.name)}
      />

      {/* Section Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-background px-2 gap-1 py-1 no-scrollbar sticky top-[72px] z-20">
        {sections.map((sec, idx) => {
          const secAnswered = sec.questions.filter(q => responses[q.question_id]?.answer_value || responses[q.question_id]?.pass_fail_status).length;
          return (
            <button
              key={sec.name}
              onClick={() => handleSectionChange(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                idx === currentSectionIdx
                  ? 'bg-foreground text-background'
                  : secAnswered === sec.questions.length && sec.questions.length > 0
                  ? 'bg-rka-green-light text-rka-green-dark'
                  : 'text-muted-foreground active:bg-muted'
              }`}
            >
              {sec.name}
              <span className="ml-1 text-xs opacity-70">{secAnswered}/{sec.questions.length}</span>
            </button>
          );
        })}
      </div>

      {/* Pass All Button */}
      {hasChecklistItems && (
        <div className="px-4 py-2 border-b border-border">
          <button
            onClick={handlePassAll}
            disabled={allChecklistPassed}
            className={`w-full tap-target rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              allChecklistPassed
                ? 'bg-rka-green/20 text-rka-green-dark'
                : 'bg-rka-green text-primary-foreground'
            }`}
          >
            <Check className="w-5 h-5" />
            {allChecklistPassed ? 'All Passed ✓' : `Pass All — ${currentSection.name}`}
          </button>
        </div>
      )}

      {/* Questions */}
      <div className="flex-1">
        {currentSection?.questions.map(q => (
          <StandardQuestionBlock
            key={q.question_id}
            question={q}
            response={responses[q.question_id] || {
              question_id: q.question_id,
              answer_value: null,
              pass_fail_status: null,
              severity: null,
              comment: null,
              photo_urls: [],
              defect_flag: false,
            }}
            onUpdate={(r) => handleResponseUpdate(q.question_id, r)}
          />
        ))}
      </div>

      {/* Section Navigation */}
      <div className="px-4 py-2 border-t border-border flex gap-2">
        {currentSectionIdx > 0 && (
          <button
            onClick={() => handleSectionChange(currentSectionIdx - 1)}
            className="flex-1 tap-target bg-muted rounded-xl font-semibold text-sm"
          >
            ← {sections[currentSectionIdx - 1].name}
          </button>
        )}
        {currentSectionIdx < sections.length - 1 && (
          <button
            onClick={() => handleSectionChange(currentSectionIdx + 1)}
            className="flex-1 tap-target bg-foreground text-background rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5 text-rka-green" />
            Next — {sections[currentSectionIdx + 1].name}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2 bg-background">
        <button
          onClick={() => saveInspection('Draft')}
          disabled={saving}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save & Return'}
        </button>
        <button
          onClick={() => {
            if (defectCount > 0) {
              setShowStatusPicker(true);
            } else {
              saveInspection('Submitted');
              onBack();
            }
          }}
          disabled={saving || totalAnswered === 0}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <CheckCircle className="w-5 h-5" />
          Submit Inspection ({totalAnswered}/{totalQuestions})
        </button>
      </div>

      {/* Status Picker */}
      {showStatusPicker && (
        <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end justify-center">
          <div className="bg-background w-full max-w-lg rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-rka-orange" />
              <h3 className="text-lg font-bold">Set Asset Status</h3>
            </div>
            <p className="text-sm text-muted-foreground">{defectCount} defect{defectCount !== 1 ? 's' : ''} found.</p>
            {['Safe to Operate', 'Operate with Limitations', 'Unsafe to Operate'].map(status => (
              <button
                key={status}
                onClick={async () => {
                  if (inspectionId) {
                    await supabase.from('db_inspections').update({ crane_status: status }).eq('id', inspectionId);
                  }
                  setShowStatusPicker(false);
                  await saveInspection('Submitted');
                  onBack();
                }}
                className={`w-full tap-target rounded-xl font-bold text-base ${
                  status === 'Safe to Operate' ? 'bg-rka-green text-primary-foreground' :
                  status === 'Operate with Limitations' ? 'bg-rka-orange text-destructive-foreground' :
                  'bg-rka-red text-destructive-foreground'
                }`}
              >
                {status}
              </button>
            ))}
            <button onClick={() => setShowStatusPicker(false)} className="w-full tap-target bg-muted rounded-xl font-semibold text-sm">Cancel</button>
          </div>
        </div>
      )}

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />
    </div>
  );
}
