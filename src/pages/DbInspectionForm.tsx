import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { StandardQuestionBlock, QuestionConfig, ResponseData } from '@/components/StandardQuestionBlock';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { supabase } from '@/integrations/supabase/client';
import { Save, CheckCircle, Check, Eye, Loader2, Sparkles, CalendarIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { generateInspectionPdf } from '@/utils/generateInspectionPdf';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import type jsPDF from 'jspdf';

interface DbInspectionFormProps {
  formId: string;
  assetName: string;
  assetId?: string;
  clientId?: string;
  siteName?: string;
  existingInspectionId?: string;
  taskId?: string;
  onBack: () => void;
  onSubmitComplete?: () => void;
}

interface FormQuestion extends QuestionConfig {
  override_sort_order: number | null;
  section_override: string | null;
  sub_heading: string | null;
  conditional_rule: string | null;
}

export default function DbInspectionForm({
  formId, assetName, assetId, clientId, siteName, existingInspectionId, taskId, onBack, onSubmitComplete
}: DbInspectionFormProps) {

  // Safely parse a DB field that may be a JSON string or already an array
  const parseJsonArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };
  const { state } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseData>>({});
  const [inspectionId, setInspectionId] = useState<string | null>(existingInspectionId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [formName, setFormName] = useState('');

  const [previewPdfDoc, setPreviewPdfDoc] = useState<jsPDF | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [otherNotes, setOtherNotes] = useState<string>('');
  const [assetPhotoUrl, setAssetPhotoUrl] = useState<string | undefined>(undefined);
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [inspectionDate, setInspectionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [craneStatus, setCraneStatus] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);


  // Load questions for this form
  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);

      // Guard: bail out if formId is missing
      if (!formId) {
        setLoading(false);
        return;
      }

      // Get form name
      const { data: formData } = await supabase
        .from('form_templates')
        .select('form_name')
        .eq('form_id', formId)
        .single();
      if (formData) setFormName(formData.form_name);

      // Fetch asset photo and client name
      if (assetId) {
        const { data: assetData } = await supabase
          .from('assets')
          .select('main_photo_url')
          .eq('id', assetId)
          .single();
        if (assetData?.main_photo_url) setAssetPhotoUrl(assetData.main_photo_url);
      }

      if (clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('client_name')
          .eq('id', clientId)
          .single();
        if (clientData) setClientName(clientData.client_name || '');
      }

      // Get questions via bridge table
      const { data: bridgeData } = await supabase
        .from('form_template_questions')
        .select('question_id, required, override_sort_order, override_help_text, override_standard_ref, section_override, sub_heading, conditional_rule')
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

        // Parse any JSON-string fields that may come from text-typed DB columns
        const parsedOptions = parseJsonArray(q.options);
        const parsedAutoDefects = parseJsonArray((q as any).auto_defect_types);
        const parsedAdvancedOptions = parseJsonArray((q as any).advanced_defect_options);

        return {
          question_id: q.question_id,
          question_text: q.question_text,
          help_text: bridge.override_help_text || q.help_text,
          standard_ref: bridge.override_standard_ref || q.standard_ref,
          answer_type: q.answer_type,
          options: parsedOptions.length > 0 ? parsedOptions : null,
          requires_photo_on_fail: q.requires_photo_on_fail,
          requires_comment_on_fail: q.requires_comment_on_fail,
          severity_required_on_fail: q.severity_required_on_fail,
          optional_photo: (q as any).optional_photo ?? false,
          optional_comment: (q as any).optional_comment ?? false,
          auto_defect_types: parsedAutoDefects,
          advanced_defect_options: parsedAdvancedOptions,
          required: bridge.required,
          section: bridge.section_override || q.section,
          override_sort_order: bridge.override_sort_order,
          section_override: bridge.section_override,
          sub_heading: bridge.sub_heading || null,
          conditional_rule: bridge.conditional_rule || null,
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
          urgency: null,
          defect_types: [],
          advanced_defect_detail: [],
          internal_note: null,
          suggested_defect_type: null,
          suggested_defect_detail: null,
        };
      });

      // If existing inspection, load saved responses and AI summary
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
              photo_urls: Array.isArray(sr.photo_urls) ? sr.photo_urls : [],
              defect_flag: sr.defect_flag,
              urgency: (sr as any).urgency || null,
              defect_types: parseJsonArray((sr as any).defect_types),
              advanced_defect_detail: parseJsonArray((sr as any).advanced_defect_detail),
              internal_note: (sr as any).internal_note || null,
            };
          });
        }

        // Load existing AI summary and other notes
        const { data: inspData } = await supabase
          .from('db_inspections')
          .select('ai_summary, other_notes, inspection_date')
          .eq('id', existingInspectionId)
          .single();
        if (inspData?.ai_summary) setAiSummary(inspData.ai_summary);
        if ((inspData as any)?.other_notes) setOtherNotes((inspData as any).other_notes);
        if (inspData?.inspection_date) setInspectionDate(inspData.inspection_date);
        // Load crane_status
        const { data: statusData } = await supabase
          .from('db_inspections')
          .select('crane_status')
          .eq('id', existingInspectionId)
          .single();
        if (statusData?.crane_status) setCraneStatus(statusData.crane_status);
      }

      setResponses(initResponses);
      setLoading(false);
    };

    loadForm();
  }, [formId, existingInspectionId]);

  // Evaluate conditional_rule against current responses
  const evaluateRule = useCallback((rule: string | null): boolean => {
    if (!rule) return true;
    const match = rule.match(/^show_if:([^=]+)=(.+)$/);
    if (!match) return true;
    const [, questionId, valuesStr] = match;
    const allowedValues = valuesStr.split(',');
    const currentValue = responses[questionId]?.answer_value;
    return currentValue ? allowedValues.includes(currentValue) : false;
  }, [responses]);

  // Group questions by section, filtering by conditional rules
  const sections = useMemo(() => {
    const sectionMap: Record<string, FormQuestion[]> = {};
    const sectionOrder: string[] = [];
    questions.forEach(q => {
      if (!evaluateRule(q.conditional_rule)) return;
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
  }, [questions, evaluateRule]);

  const currentSection = sections[Math.min(currentSectionIdx, sections.length - 1)];

  // Clamp section index when sections change (e.g. conditional sections hidden)
  useEffect(() => {
    if (currentSectionIdx >= sections.length && sections.length > 0) {
      setCurrentSectionIdx(sections.length - 1);
    }
  }, [sections.length, currentSectionIdx]);

  // Autosave: debounce saving responses after each change
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    // Skip the initial load
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveInspection('Draft');
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [responses, aiSummary, otherNotes]);

  // Stats – only count visible questions
  const visibleQuestionIds = useMemo(() => new Set(sections.flatMap(s => s.questions.map(q => q.question_id))), [sections]);
  const totalAnswered = Object.values(responses).filter(r => visibleQuestionIds.has(r.question_id) && (r.answer_value || r.pass_fail_status)).length;
  const totalQuestions = visibleQuestionIds.size;
  const defectCount = Object.values(responses).filter(r => visibleQuestionIds.has(r.question_id) && r.defect_flag).length;

  const handleResponseUpdate = useCallback((questionId: string, response: ResponseData) => {
    setResponses(prev => ({ ...prev, [questionId]: response }));
    // Sync asset status question with craneStatus for PDF
    if (questionId === 'OC2-AO-001' || questionId === 'JIB_OUT_01') {
      const val = response.answer_value;
      if (val) {
        setCraneStatus(val);
        if (inspectionId) {
          supabase.from('db_inspections').update({ crane_status: val }).eq('id', inspectionId);
        }
      }
    }
  }, [inspectionId]);

  const handleSectionChange = useCallback((idx: number) => {
    setCurrentSectionIdx(idx);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Pass All checklist items in current section
  // Pass All checklist items in current section (including SingleSelect positive values)
  const handlePassAll = useCallback(() => {
    if (!currentSection) return;
    const updates = { ...responses };
    currentSection.questions.forEach(q => {
      const existing = updates[q.question_id];
      if (existing?.pass_fail_status === 'Fail' || existing?.defect_flag) return; // Don't override defects

      if ((q.answer_type === 'PassFailNA' || q.answer_type === 'YesNoNA') && !existing?.pass_fail_status) {
        updates[q.question_id] = {
          ...updates[q.question_id],
          pass_fail_status: 'Pass',
          answer_value: q.answer_type === 'YesNoNA' ? 'Yes' : 'Pass',
          defect_flag: false,
        };
      } else if (q.answer_type === 'YesNo' && !existing?.answer_value) {
        updates[q.question_id] = {
          ...updates[q.question_id],
          pass_fail_status: 'Pass',
          answer_value: 'Yes',
          defect_flag: false,
        };
      } else if (q.answer_type === 'SingleSelect' && q.options && q.options.length > 0 && !existing?.answer_value) {
        // Select first (positive) option
        const firstOpt = q.options[0];
        updates[q.question_id] = {
          ...updates[q.question_id],
          pass_fail_status: 'Pass',
          answer_value: firstOpt,
          defect_flag: false,
        };
      }
    });
    setResponses(updates);
  }, [currentSection, responses]);

  const passableTypes = ['PassFailNA', 'YesNoNA', 'YesNo', 'SingleSelect'];
  const hasChecklistItems = currentSection?.questions.some(q => passableTypes.includes(q.answer_type)) || false;
  const allChecklistPassed = currentSection?.questions
    .filter(q => passableTypes.includes(q.answer_type))
    .every(q => responses[q.question_id]?.pass_fail_status === 'Pass' || (responses[q.question_id]?.answer_value && !responses[q.question_id]?.defect_flag)) || false;

  const handlePreviewPdf = async () => {
    setGeneratingPreview(true);
    try {
      // Re-fetch latest asset photo URL before generating
      let latestPhotoUrl = assetPhotoUrl;
      if (assetId) {
        const { data: freshAsset } = await supabase.from('assets').select('main_photo_url').eq('id', assetId).single();
        if (freshAsset?.main_photo_url) {
          latestPhotoUrl = freshAsset.main_photo_url;
          setAssetPhotoUrl(freshAsset.main_photo_url);
        }
      }

      const pdfSections = sections.map(s => ({
        name: s.name,
        questions: s.questions.map(q => ({
          question_text: q.question_text,
          section: q.section,
          answer_value: responses[q.question_id]?.answer_value || null,
          pass_fail_status: responses[q.question_id]?.pass_fail_status || null,
          severity: responses[q.question_id]?.severity || null,
          comment: responses[q.question_id]?.comment || null,
          defect_flag: responses[q.question_id]?.defect_flag || false,
          photo_urls: responses[q.question_id]?.photo_urls || [],
          standard_ref: q.standard_ref || null,
          urgency: responses[q.question_id]?.urgency || null,
          defect_types: responses[q.question_id]?.defect_types || [],
          internal_note: responses[q.question_id]?.internal_note || null,
        })),
      }));

      const pdf = await generateInspectionPdf({
        formName,
        assetName,
        siteName,
        technicianName: state.currentUser?.name || 'Technician',
        inspectionDate: inspectionDate,
        craneStatus: craneStatus || undefined,
        sections: pdfSections,
        aiSummary: aiSummary || undefined,
        otherNotes: otherNotes || undefined,
        assetPhotoUrl: latestPhotoUrl,
      });
      setPreviewPdfDoc(pdf);
      return pdf;
    } catch (err: any) {
      console.error('Preview error:', err);
      toast.error('Failed to generate preview');
      return null;
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleDownloadPdf = async () => {
    let doc = previewPdfDoc;
    if (!doc) {
      doc = await handlePreviewPdf();
    }
    if (doc) {
      const dateStr = format(new Date(inspectionDate), 'dd-MM-yyyy');
      // Format: [Client Name] [Asset Name] Report [Date]
      const rawFileName = `${clientName || siteName || 'Client'} ${assetName} Report ${dateStr}.pdf`;
      const fileName = rawFileName.replace(/[/\\?%*:|"<>]/g, '-');
      doc.save(fileName);
    }
  };

  // Generate AI Executive Summary
  const generateAISummary = async () => {
    setGeneratingAI(true);
    // Save first to ensure we have an inspection ID and responses saved
    await saveInspection('Draft');
    const currentId = inspectionId;
    if (!currentId) {
      toast.error('Please save the inspection first');
      setGeneratingAI(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('generate-inspection-summary', {
        body: { inspectionId: currentId },
      });
      if (error) throw error;
      if (data?.summary) {
        setAiSummary(data.summary);
        toast.success('AI summary generated');
      }
    } catch (err: any) {
      console.error('AI summary error:', err);
      toast.error('Failed to generate AI summary');
    }
    setGeneratingAI(false);
  };

  // Save to database
  const saveInspection = async (status: string = 'Draft', overrideDate?: string) => {
    setSaving(true);
    try {
      let currentInspId = inspectionId;
      const dateToUse = overrideDate || inspectionDate;

      if (!currentInspId) {
        // Create inspection record
        const insertPayload: any = {
          form_id: formId,
          client_id: clientId || null,
          site_name: siteName || null,
          asset_id: assetId || null,
          asset_name: assetName,
          technician_id: state.currentUser?.id || 'unknown',
          technician_name: state.currentUser?.name || 'Unknown',
          status,
          inspection_date: dateToUse,
          crane_status: craneStatus || null,
          ai_summary: aiSummary || null,
        };
        if (taskId) insertPayload.task_id = taskId;

        const { data: newInsp, error } = await supabase
          .from('db_inspections')
          .insert(insertPayload)
          .select('id')
          .single();

        if (error) throw error;
        currentInspId = newInsp.id;
        setInspectionId(currentInspId);
      } else {
        await supabase
          .from('db_inspections')
          .update({
            status,
            updated_at: new Date().toISOString(),
            other_notes: otherNotes || null,
            inspection_date: dateToUse,
            crane_status: craneStatus || null,
            ai_summary: aiSummary || null
          } as any)
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
          urgency: r.urgency || null,
          defect_types: r.defect_types || [],
          advanced_defect_detail: r.advanced_defect_detail || [],
          internal_note: r.internal_note || null,
          updated_at: new Date().toISOString(),
        }));

      if (responseRows.length > 0) {
        const { error: respError } = await supabase
          .from('inspection_responses')
          .upsert(responseRows, { onConflict: 'inspection_id,question_id' });
        if (respError) throw respError;

        // Save defect suggestions to defect_suggestions table
        if (status === 'Submitted') {
          const suggestions = Object.values(responses)
            .filter(r => r.defect_flag && (r.suggested_defect_type || r.suggested_defect_detail))
            .flatMap(r => {
              const items: any[] = [];
              if (r.suggested_defect_type) {
                items.push({
                  inspection_id: currentInspId,
                  question_id: r.question_id,
                  suggestion_type: 'defect_type',
                  suggestion_value: r.suggested_defect_type,
                  suggested_by_id: state.currentUser?.id || 'unknown',
                  suggested_by_name: state.currentUser?.name || 'Unknown',
                });
              }
              if (r.suggested_defect_detail) {
                items.push({
                  inspection_id: currentInspId,
                  question_id: r.question_id,
                  suggestion_type: 'defect_detail',
                  suggestion_value: r.suggested_defect_detail,
                  suggested_by_id: state.currentUser?.id || 'unknown',
                  suggested_by_name: state.currentUser?.name || 'Unknown',
                });
              }
              return items;
            });
          if (suggestions.length > 0) {
            await supabase.from('defect_suggestions').insert(suggestions);
          }
        }
      }

      setLastSaved(new Date().toLocaleTimeString());
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
        <AppHeader title={formName || 'Form'} subtitle="Unable to load" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Form could not be loaded</p>
            <p className="text-sm">No questions found for this form template{formId ? ` (${formId})` : ''}.</p>
            <p className="text-xs">This may be a configuration issue — please contact your admin.</p>
          </div>
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
      >
        {lastSaved && (
          <div className="px-4 py-1 bg-muted/30 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Check className="w-3 h-3 text-rka-green" />
              Autosaved
            </span>
            <span className="text-[10px] text-muted-foreground">{lastSaved}</span>
          </div>
        )}
      </AppHeader>

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
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${idx === currentSectionIdx
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
            className={`w-full tap-target rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${allChecklistPassed
              ? 'bg-rka-green/20 text-rka-green-dark'
              : 'bg-rka-green text-primary-foreground'
              }`}
          >
            <Check className="w-5 h-5" />
            {allChecklistPassed ? 'All Passed ✓' : `Pass All — ${currentSection.name}`}
          </button>
        </div>
      )}

      {/* Risk Summary — show on Technician Summary section */}
      {currentSection?.name === 'Technician Summary' && (() => {
        // Calculate risk percentages from all 3-option SingleSelect questions (excluding Technician Summary)
        const ratingQuestions = sections
          .filter(s => s.name !== 'Technician Summary')
          .flatMap(s => s.questions)
          .filter(q => q.answer_type === 'SingleSelect' && q.options && q.options.length === 3);

        const answered = ratingQuestions.filter(q => responses[q.question_id]?.answer_value);
        let greenCount = 0, amberCount = 0, redCount = 0;
        answered.forEach(q => {
          const val = responses[q.question_id]?.answer_value;
          const opts = q.options!;
          if (val === opts[0]) greenCount++;
          else if (val === opts[1]) amberCount++;
          else if (val === opts[2]) redCount++;
        });
        const total = answered.length || 1;
        const greenPct = Math.round((greenCount / total) * 100);
        const amberPct = Math.round((amberCount / total) * 100);
        const redPct = Math.round((redCount / total) * 100);

        return (
          <div className="px-4 py-4 border-b border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Overall Site Risk</h3>
            <div className="flex gap-2">
              {/* Green */}
              <div className="flex-1 bg-rka-green/10 border border-rka-green/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-rka-green">{greenPct}%</p>
                <p className="text-xs font-semibold text-rka-green mt-0.5">Good</p>
                <p className="text-xs text-muted-foreground">{greenCount} items</p>
              </div>
              {/* Amber */}
              <div className="flex-1 bg-rka-orange/10 border border-rka-orange/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-rka-orange">{amberPct}%</p>
                <p className="text-xs font-semibold text-rka-orange mt-0.5">Monitor</p>
                <p className="text-xs text-muted-foreground">{amberCount} items</p>
              </div>
              {/* Red */}
              <div className="flex-1 bg-rka-red/10 border border-rka-red/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-rka-red">{redPct}%</p>
                <p className="text-xs font-semibold text-rka-red mt-0.5">Attention</p>
                <p className="text-xs text-muted-foreground">{redCount} items</p>
              </div>
            </div>
            {answered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">Complete the inspection sections to see risk breakdown</p>
            )}
          </div>
        );
      })()}

      {/* Questions */}
      <div className="flex-1">
        {currentSection?.questions.map((q, idx) => {
          const prevSubHeading = idx > 0 ? currentSection.questions[idx - 1].sub_heading : null;
          const showSubHeading = q.sub_heading && q.sub_heading !== prevSubHeading;
          return (
            <div key={q.question_id}>
              {showSubHeading && (
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{q.sub_heading}</h3>
                </div>
              )}
              <StandardQuestionBlock
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
            </div>
          );
        })}
      </div>

      {/* Other / Additional Notes — free text for anything missed */}
      {currentSectionIdx === sections.length - 1 && (
        <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-2">
          <p className="text-sm font-bold text-foreground">Other Notes / Additional Observations</p>
          <p className="text-xs text-muted-foreground">Use this for anything not covered by the form questions above.</p>
          <textarea
            value={otherNotes}
            onChange={(e) => setOtherNotes(e.target.value)}
            placeholder="Enter any additional observations, findings, or notes…"
            rows={3}
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
          />
        </div>
      )}


      <div className="px-4 py-2 border-t border-border flex gap-2 bg-background sticky bottom-0 z-30">
        <button
          onClick={() => saveInspection('Draft')}
          disabled={saving}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-muted text-muted-foreground active:bg-muted-foreground active:text-background transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        </button>

        {currentSectionIdx > 0 && (
          <button
            onClick={() => handleSectionChange(currentSectionIdx - 1)}
            className="flex-1 tap-target bg-muted rounded-xl font-semibold text-sm"
          >
            ← Back
          </button>
        )}
        {currentSectionIdx < sections.length - 1 ? (
          <button
            onClick={() => handleSectionChange(currentSectionIdx + 1)}
            className="flex-1 tap-target bg-foreground text-background rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5 text-rka-green" />
            Next
          </button>
        ) : (
          <button
            onClick={() => saveInspection('Submitted')}
            disabled={saving || totalAnswered < totalQuestions}
            className="flex-1 tap-target bg-rka-green text-primary-foreground rounded-xl font-black text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Submit Report
          </button>
        )}
      </div>

      {/* AI Executive Summary — only on last section */}
      {currentSectionIdx === sections.length - 1 && (
        <div className="px-4 py-3 border-t border-border bg-background space-y-3">
          <button
            onClick={generateAISummary}
            disabled={generatingAI || totalAnswered === 0}
            className="w-full tap-target bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generatingAI ? 'Generating AI Summary…' : aiSummary ? 'Regenerate AI Summary' : 'Generate AI Executive Summary'}
          </button>
          {aiSummary && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Edit Executive Summary</p>
                <button
                  onClick={() => saveInspection('Draft')}
                  className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md"
                >
                  <Save className="w-3 h-3" />
                  Save Summary Changes
                </button>
              </div>
              <textarea
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                placeholder="Enter executive summary…"
                rows={8}
                className="w-full p-4 border border-border rounded-xl bg-muted text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-[10px] text-muted-foreground px-1 italic">
                Note: This summary appears on the front page of the final PDF report.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2 bg-background">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handlePreviewPdf}
            disabled={generatingPreview || totalAnswered === 0}
            className="h-11 bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {generatingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview PDF
          </button>
          <button
            onClick={async () => {
              await saveInspection('Draft');
              onBack();
            }}
            disabled={saving}
            className="h-11 bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={generatingPreview || totalAnswered === 0}
          className="w-full h-11 bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>

        <button
          onClick={() => {
            setShowDateConfirm(true);
          }}
          disabled={saving || totalAnswered === 0}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <CheckCircle className="w-5 h-5" />
          Complete Form ({totalAnswered}/{totalQuestions})
        </button>
      </div>

      {/* Date Confirmation Modal */}
      {showDateConfirm && (
        <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end justify-center">
          <div className="bg-background w-full max-w-lg rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-bold">Confirm Inspection Date</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Is this the correct date for the inspection report?
            </p>
            <input
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="w-full p-3 border border-border rounded-xl bg-background text-foreground text-base font-semibold text-center"
            />
            <button
              onClick={async () => {
                setShowDateConfirm(false);
                await saveInspection('Submitted', inspectionDate);
                (onSubmitComplete || onBack)();
              }}
              disabled={saving}
              className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {saving ? 'Submitting…' : 'Confirm & Submit'}
            </button>
            <button
              onClick={() => setShowDateConfirm(false)}
              className="w-full tap-target bg-muted rounded-xl font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />

      <PdfPreviewModal
        open={!!previewPdfDoc}
        onClose={() => setPreviewPdfDoc(null)}
        pdfDoc={previewPdfDoc}
        onDownload={() => {
          if (!previewPdfDoc) return;
          const safeName = assetName.replace(/[^a-zA-Z0-9]/g, '_');
          const dateStr = new Date().toISOString().slice(0, 10);
          previewPdfDoc.save(`${safeName}_Inspection_${dateStr}.pdf`);
        }}
        title="Inspection Report Preview"
      />
    </div>
  );
}
