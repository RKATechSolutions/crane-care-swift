import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import {
  partAGroups,
  partBFacets,
  scoreLabels,
  facetNames,
} from '@/data/siteAssessmentQuestions';
import { generateAssessmentPdf } from '@/utils/generateAssessmentPdf';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  FileText,
  Sparkles,
  Download,
} from 'lucide-react';

type Answers = Record<string, number>;

interface SiteAssessmentFormProps {
  assessmentType: 'Initial Site Baseline' | '12-Month Review';
  existingId?: string;
  onBack: () => void;
}

const SECTIONS = [
  { id: 'setup', label: 'Setup' },
  { id: 'partA', label: 'Part A' },
  ...partBFacets.map(f => ({ id: f.id, label: `Facet ${f.number}` })),
  { id: 'summary', label: 'Summary' },
];

export default function SiteAssessmentForm({ assessmentType, existingId, onBack }: SiteAssessmentFormProps) {
  const { state } = useApp();
  const { toast } = useToast();
  const site = state.selectedSite!;

  const [sectionIdx, setSectionIdx] = useState(0);
  const [completionMethod, setCompletionMethod] = useState('');
  const [partAAnswers, setPartAAnswers] = useState<Answers>({});
  const [partBAnswers, setPartBAnswers] = useState<Answers>({});
  const [facetNotes, setFacetNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [assessmentId, setAssessmentId] = useState(existingId || '');
  const [status, setStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [clientDetails, setClientDetails] = useState<{ address?: string; contactName?: string; phone?: string; email?: string }>({});

  // Fetch client details from DB
  useEffect(() => {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    if (!clientId) return;
    const fetchClient = async () => {
      const { data } = await supabase.from('clients').select('location_address, primary_contact_name, primary_contact_mobile, primary_contact_email').eq('id', clientId).single();
      if (data) {
        setClientDetails({
          address: data.location_address || undefined,
          contactName: data.primary_contact_name || undefined,
          phone: data.primary_contact_mobile || undefined,
          email: data.primary_contact_email || undefined,
        });
      }
    };
    fetchClient();
  }, [site.id]);

  // Load existing assessment
  useEffect(() => {
    if (!existingId) return;
    const load = async () => {
      const { data } = await supabase
        .from('site_assessments')
        .select('*')
        .eq('id', existingId)
        .single();
      if (data) {
        setCompletionMethod(data.completion_method);
        setPartAAnswers((data.part_a_answers as Answers) || {});
        setPartBAnswers((data.part_b_answers as Answers) || {});
        setFacetNotes((data.facet_notes as Record<string, string>) || {});
        setAiSummary(data.ai_executive_summary || '');
        setStatus(data.status as 'in_progress' | 'completed');
      }
    };
    load();
  }, [existingId]);

  const currentSection = SECTIONS[sectionIdx];

  // Score calculations
  const scores = useMemo(() => {
    const facetScores: Record<string, number> = {};
    partBFacets.forEach(facet => {
      facetScores[facet.id] = facet.questions.reduce(
        (sum, q) => sum + (partBAnswers[q.id] ?? 0),
        0
      );
    });

    const allAnswers = { ...partAAnswers, ...partBAnswers };
    const answeredValues = Object.values(allAnswers);
    const totalScore = answeredValues.reduce((sum, v) => sum + v, 0);
    const countNotYet = answeredValues.filter(v => v === 0).length;
    const countPartial = answeredValues.filter(v => v === 1).length;

    const facetEntries = Object.entries(facetScores);
    const highestRisk = facetEntries.length > 0
      ? facetEntries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0]
      : '';
    const strongest = facetEntries.length > 0
      ? facetEntries.reduce((a, b) => (a[1] >= b[1] ? a : b))[0]
      : '';

    return {
      facetScores,
      totalScore,
      countNotYet,
      countPartial,
      highestRisk,
      strongest,
    };
  }, [partAAnswers, partBAnswers]);

  const setAnswer = useCallback((part: 'a' | 'b', questionId: string, value: number) => {
    if (part === 'a') {
      setPartAAnswers(prev => ({ ...prev, [questionId]: value }));
    } else {
      setPartBAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  }, []);

  const saveAssessment = useCallback(async (doComplete = false) => {
    if (!completionMethod) {
      toast({ title: 'Please select a completion method', variant: 'destructive' });
      return null;
    }
    setSaving(true);
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;

    const payload = {
      client_id: clientId,
      site_name: site.name,
      assessment_type: assessmentType,
      completion_method: completionMethod,
      status: doComplete ? 'completed' : 'in_progress',
      part_a_answers: partAAnswers,
      part_b_answers: partBAnswers,
      facet_notes: facetNotes,
      facet1_score: scores.facetScores.facet1 || 0,
      facet2_score: scores.facetScores.facet2 || 0,
      facet3_score: scores.facetScores.facet3 || 0,
      facet4_score: scores.facetScores.facet4 || 0,
      facet5_score: scores.facetScores.facet5 || 0,
      facet6_score: scores.facetScores.facet6 || 0,
      facet7_score: scores.facetScores.facet7 || 0,
      total_score: scores.totalScore,
      count_not_yet: scores.countNotYet,
      count_partial: scores.countPartial,
      highest_risk_facet: facetNames[scores.highestRisk] || '',
      strongest_facet: facetNames[scores.strongest] || '',
      ai_executive_summary: aiSummary || null,
      technician_id: state.currentUser?.id || '',
      technician_name: state.currentUser?.name || '',
      ...(doComplete ? { completed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    };

    let id = assessmentId;
    if (id) {
      await supabase.from('site_assessments').update(payload).eq('id', id);
    } else {
      const { data } = await supabase.from('site_assessments').insert(payload).select('id').single();
      if (data) {
        id = data.id;
        setAssessmentId(id);
      }
    }
    if (doComplete) setStatus('completed');
    setSaving(false);
    toast({ title: doComplete ? 'Assessment completed!' : 'Progress saved' });
    return id;
  }, [completionMethod, site, assessmentType, partAAnswers, partBAnswers, facetNotes, scores, aiSummary, assessmentId, state.currentUser, toast]);

  const generateAISummary = useCallback(async () => {
    setGeneratingAI(true);
    const id = await saveAssessment(false);
    if (!id) { setGeneratingAI(false); return; }

    try {
      const { data, error } = await supabase.functions.invoke('generate-site-assessment-summary', {
        body: { assessmentId: id },
      });
      if (error) throw error;
      if (data?.summary) {
        setAiSummary(data.summary);
        // Save the summary
        await supabase.from('site_assessments').update({
          ai_executive_summary: data.summary,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      }
    } catch (err) {
      console.error('AI summary error:', err);
      toast({ title: 'Failed to generate summary', variant: 'destructive' });
    }
    setGeneratingAI(false);
  }, [saveAssessment, toast]);

  const handleComplete = async () => {
    setCompleting(true);
    await saveAssessment(true);
    setCompleting(false);
  };

  const goNext = () => {
    if (sectionIdx < SECTIONS.length - 1) {
      setSectionIdx(sectionIdx + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };
  const goPrev = () => {
    if (sectionIdx > 0) {
      setSectionIdx(sectionIdx - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const isReadOnly = status === 'completed';

  // Count answered per section for progress
  const partATotal = partAGroups.reduce((s, g) => s + g.questions.length, 0);
  const partADone = partAGroups.reduce((s, g) => s + g.questions.filter(q => partAAnswers[q.id] !== undefined).length, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={assessmentType === 'Initial Site Baseline' ? 'Initial Site Inspection' : 'Annual Site Review'}
        subtitle={site.name}
        onBack={onBack}
      />

      {/* Section tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-background px-2 gap-1 py-1 no-scrollbar sticky top-[56px] z-20">
        {SECTIONS.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => { setSectionIdx(idx); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              idx === sectionIdx
                ? 'bg-foreground text-background'
                : 'text-muted-foreground active:bg-muted'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {/* SETUP SECTION */}
        {currentSection.id === 'setup' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-bold mb-2 block">Assessment Type</label>
              <div className="p-3 bg-muted rounded-xl text-sm font-medium">{assessmentType}</div>
            </div>
            <div>
              <label className="text-sm font-bold mb-2 block">Assessment Completion Method</label>
              <div className="space-y-2">
                {['Customer Pre-Completed', 'Completed On Site with Customer', 'Completed Internally'].map(opt => (
                  <button
                    key={opt}
                    disabled={isReadOnly}
                    onClick={() => setCompletionMethod(opt)}
                    className={`w-full text-left p-3 rounded-xl text-sm font-medium transition-all border ${
                      completionMethod === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border active:bg-muted'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PART A */}
        {currentSection.id === 'partA' && (
          <div className="pb-4">
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Part A: Pre-Site Questionnaire ({partADone}/{partATotal})
              </p>
            </div>
            {partAGroups.map(group => (
              <div key={group.id}>
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <p className="text-sm font-bold">{group.title}</p>
                </div>
                {group.questions.map(q => (
                  <RadioQuestion
                    key={q.id}
                    label={q.label}
                    value={partAAnswers[q.id]}
                    onChange={(v) => setAnswer('a', q.id, v)}
                    readOnly={isReadOnly}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* PART B FACETS */}
        {partBFacets.map(facet => currentSection.id === facet.id && (
          <div key={facet.id} className="pb-4">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Facet {facet.number} – {facet.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Score: {scores.facetScores[facet.id] || 0} / {facet.questions.length * 2}
              </p>
            </div>
            {facet.questions.map(q => (
              <RadioQuestion
                key={q.id}
                label={q.label}
                value={partBAnswers[q.id]}
                onChange={(v) => setAnswer('b', q.id, v)}
                readOnly={isReadOnly}
              />
            ))}
            <div className="px-4 pt-3">
              <label className="text-sm font-bold mb-1 block">Key Notes</label>
              <textarea
                value={facetNotes[facet.id] || ''}
                onChange={(e) => setFacetNotes(prev => ({ ...prev, [facet.id]: e.target.value }))}
                disabled={isReadOnly}
                placeholder="Add key observations for this facet..."
                className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
          </div>
        ))}

        {/* SUMMARY */}
        {currentSection.id === 'summary' && (
          <div className="p-4 space-y-4">
            <div className="bg-muted/50 rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3">Score Summary</h3>
              <div className="space-y-2">
                {partBFacets.map(f => {
                  const score = scores.facetScores[f.id] || 0;
                  const max = f.questions.length * 2;
                  const pct = max > 0 ? (score / max) * 100 : 0;
                  return (
                    <div key={f.id} className="flex items-center gap-2">
                      <span className="text-xs w-32 truncate font-medium">{f.title}</span>
                      <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 75 ? 'bg-rka-green' : pct >= 40 ? 'bg-rka-orange' : 'bg-rka-red'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{score}/{max}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                <span className="font-bold">Total Score</span>
                <span className="font-bold">{scores.totalScore}</span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Not Yet Implemented: {scores.countNotYet}</span>
                <span>Partially: {scores.countPartial}</span>
              </div>
              {scores.highestRisk && (
                <div className="mt-2 text-xs">
                  <span className="text-rka-red font-bold">⚠ Highest Risk: </span>
                  <span>{facetNames[scores.highestRisk]}</span>
                </div>
              )}
              {scores.strongest && (
                <div className="text-xs">
                  <span className="text-rka-green font-bold">★ Strongest: </span>
                  <span>{facetNames[scores.strongest]}</span>
                </div>
              )}
            </div>

            {/* AI Summary */}
            <div>
              <button
                onClick={generateAISummary}
                disabled={generatingAI || isReadOnly}
                className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingAI ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating AI Summary...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate AI Executive Summary</>
                )}
              </button>
            </div>

            {aiSummary && (
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" />
                  <h3 className="font-bold text-sm">AI Executive Summary & 12-Month Plan</h3>
                </div>
                <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground">
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Download Report */}
            {aiSummary && (
              <button
                onClick={() => {
                  const pdf = generateAssessmentPdf({
                    siteName: site.name,
                    assessmentType,
                    completionMethod,
                    technicianName: state.currentUser?.name || '',
                    facetScores: scores.facetScores,
                    totalScore: scores.totalScore,
                    countNotYet: scores.countNotYet,
                    countPartial: scores.countPartial,
                    highestRiskFacet: facetNames[scores.highestRisk] || '',
                    strongestFacet: facetNames[scores.strongest] || '',
                    aiSummary,
                    facetNotes,
                    clientAddress: clientDetails.address || site.address,
                    clientContactName: clientDetails.contactName || site.contactName,
                    clientContactPhone: clientDetails.phone || site.contactPhone,
                    clientContactEmail: clientDetails.email,
                  });
                  const fileName = `${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_Site_Assessment_${new Date().toISOString().slice(0, 10)}.pdf`;
                  pdf.save(fileName);
                }}
                className="w-full h-11 bg-foreground text-background rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 py-2 border-t border-border flex gap-2">
        {sectionIdx > 0 && (
          <button onClick={goPrev} className="flex-1 h-11 bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-1">
            <ChevronLeft className="w-4 h-4" /> {SECTIONS[sectionIdx - 1].label}
          </button>
        )}
        {sectionIdx < SECTIONS.length - 1 && (
          <button onClick={goNext} className="flex-1 h-11 bg-foreground text-background rounded-xl font-semibold text-sm flex items-center justify-center gap-1">
            {SECTIONS[sectionIdx + 1].label} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-border space-y-2 bg-background">
        {!isReadOnly && (
          <>
            <button
              onClick={() => { saveAssessment(false); onBack(); }}
              disabled={saving}
              className="w-full h-11 bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save & Return to Assets
            </button>
            <button
              onClick={handleComplete}
              disabled={completing || !completionMethod}
              className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Complete Assessment
            </button>
          </>
        )}
        {isReadOnly && (
          <button onClick={onBack} className="w-full h-11 bg-muted rounded-xl font-semibold text-sm">
            Back to Assets
          </button>
        )}
      </div>
    </div>
  );
}

// Radio question component
function RadioQuestion({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  readOnly: boolean;
}) {
  const options = [
    { score: 2, label: 'Yes', color: 'bg-rka-green text-primary-foreground' },
    { score: 1, label: 'Partial', color: 'bg-rka-orange text-primary-foreground' },
    { score: 0, label: 'No', color: 'bg-rka-red text-primary-foreground' },
  ];

  return (
    <div className="px-4 py-3 border-b border-border">
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.score}
            disabled={readOnly}
            onClick={() => onChange(opt.score)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              value === opt.score
                ? opt.color
                : 'bg-muted text-muted-foreground'
            } disabled:opacity-70`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
