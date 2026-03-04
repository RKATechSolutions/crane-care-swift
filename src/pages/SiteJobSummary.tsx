import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { addDays, format } from 'date-fns';
import { Star, Check, AlertTriangle, Send, ChevronDown, ChevronUp, ZoomIn, X, CheckCircle, Loader2, ExternalLink, Package, ShoppingCart } from 'lucide-react';
import { ClientInfoSummarySection } from '@/components/ClientInfoSummarySection';
import { toast } from 'sonner';
import rkaReviewQr from '@/assets/rka-review-qr.png';
import { supabase } from '@/integrations/supabase/client';
import { generateJobPdf } from '@/utils/generateJobPdf';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import type jsPDF from 'jspdf';
import { FileText } from 'lucide-react';

const GOOGLE_REVIEW_URL = 'https://g.page/r/YOUR_REVIEW_LINK/review';

interface SiteJobSummaryProps {
  onCreateQuote?: (defects: any[]) => void;
}

export default function SiteJobSummary({ onCreateQuote }: SiteJobSummaryProps) {
  const { state, dispatch } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const site = state.selectedSite!;

  const completedInspections = state.inspections.filter(
    i => i.siteId === site.id && i.status === 'completed'
  );

  const latestCompletion = completedInspections.reduce((latest, i) => {
    const t = i.completedAt ? new Date(i.completedAt).getTime() : 0;
    return t > latest ? t : latest;
  }, 0);

  const defaultNextDate = latestCompletion ? addDays(new Date(latestCompletion), 84) : addDays(new Date(), 84);

  const [nextDate, setNextDate] = useState(format(defaultNextDate, 'yyyy-MM-dd'));
  const [nextTime, setNextTime] = useState(format(defaultNextDate, 'HH:mm'));
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [customerName, setCustomerName] = useState(site.contactName);
  const [customerSig, setCustomerSig] = useState('');
  const [techSig, setTechSig] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [publishTestimonial, setPublishTestimonial] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [expandedDefects, setExpandedDefects] = useState<Set<string>>(new Set());
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [defectsSaved, setDefectsSaved] = useState(false);
  const [defectsExpanded, setDefectsExpanded] = useState(true);
  const [jobType, setJobType] = useState('Periodic Inspection');
  const [customerDefectComments, setCustomerDefectComments] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingToAroflo, setSendingToAroflo] = useState(false);
  const [arofloQuoteSent, setArofloQuoteSent] = useState(false);
  const [previewPdfDoc, setPreviewPdfDoc] = useState<jsPDF | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  // Client info from database
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [clientContacts, setClientContacts] = useState<any[]>([]);

  // Database-driven defects
  interface DbDefect {
    responseId: string;
    inspectionId: string;
    questionText: string;
    assetName: string;
    severity: string | null;
    urgency: string | null;
    defectTypes: string[];
    comment: string | null;
    photoUrls: string[];
    advancedDefectDetail: string[];
    quoteStatus?: 'Quote Now' | 'Quote Later';
    customerComment?: string;
    quoteInstructions?: string;
  }
  const [dbDefects, setDbDefects] = useState<DbDefect[]>([]);
  const [dbDefectsLoading, setDbDefectsLoading] = useState(true);

  // Failed lifting register items
  interface LiftingDefect {
    id: string;
    equipment_type: string;
    serial_number: string | null;
    asset_tag: string | null;
    wll_value: number | null;
    wll_unit: string | null;
    equipment_status: string | null;
    tag_present: string | null;
    notes: string | null;
    manufacturer: string | null;
    quoteStatus?: 'Quote Now' | 'Quote Later';
    customerComment?: string;
    quoteInstructions?: string;
  }
  const [liftingDefects, setLiftingDefects] = useState<LiftingDefect[]>([]);
  const [liftingDefectsLoading, setLiftingDefectsLoading] = useState(true);

  // Load defects from database for this site
  useEffect(() => {
    const loadDbDefects = async () => {
      setDbDefectsLoading(true);
      try {
        // Find inspections for this site
        const { data: inspections } = await supabase
          .from('db_inspections')
          .select('id, asset_name, site_name, status')
          .eq('site_name', site.name);

        if (!inspections || inspections.length === 0) {
          setDbDefectsLoading(false);
          return;
        }

        const inspectionIds = inspections.map(i => i.id);

        // Get defect responses
        const { data: responses } = await supabase
          .from('inspection_responses')
          .select('id, inspection_id, question_id, severity, urgency, defect_types, comment, photo_urls, advanced_defect_detail, defect_flag')
          .in('inspection_id', inspectionIds)
          .eq('defect_flag', true);

        if (!responses || responses.length === 0) {
          setDbDefectsLoading(false);
          return;
        }

        // Get question texts
        const qIds = [...new Set(responses.map(r => r.question_id))];
        const { data: questions } = await supabase
          .from('question_library')
          .select('question_id, question_text')
          .in('question_id', qIds);
        const qMap = Object.fromEntries((questions || []).map(q => [q.question_id, q.question_text]));

        // Map inspections
        const inspMap = Object.fromEntries(inspections.map(i => [i.id, i]));

        const defects: DbDefect[] = responses.map(r => ({
          responseId: r.id,
          inspectionId: r.inspection_id,
          questionText: qMap[r.question_id] || r.question_id,
          assetName: inspMap[r.inspection_id]?.asset_name || 'Unknown',
          severity: r.severity,
          urgency: r.urgency,
          defectTypes: r.defect_types || [],
          comment: r.comment,
          photoUrls: r.photo_urls || [],
          advancedDefectDetail: r.advanced_defect_detail || [],
        }));

        setDbDefects(defects);
      } catch (err) {
        console.error('Error loading defects:', err);
      }
      setDbDefectsLoading(false);
    };
    loadDbDefects();
  }, [site.name]);

  // Load failed/non-service lifting register items for this site
  useEffect(() => {
    const loadLiftingDefects = async () => {
      setLiftingDefectsLoading(true);
      try {
        const { data } = await supabase
          .from('lifting_register')
          .select('id, equipment_type, serial_number, asset_tag, wll_value, wll_unit, equipment_status, tag_present, notes, manufacturer')
          .eq('site_name', site.name)
          .or('equipment_status.eq.Failed,equipment_status.eq.Removed From Service,tag_present.eq.false,tag_present.eq.illegible');
        
        if (data && data.length > 0) {
          setLiftingDefects(data.map(d => ({
            ...d,
            quoteStatus: undefined,
            customerComment: undefined,
            quoteInstructions: undefined,
          })));
        }
      } catch (err) {
        console.error('Error loading lifting defects:', err);
      }
      setLiftingDefectsLoading(false);
    };
    loadLiftingDefects();
  }, [site.name]);

  // Also keep legacy context defects as fallback
  const allDefects = completedInspections.flatMap(insp => {
    const template = state.templates.find(t => t.id === insp.templateId);
    const crane = site.cranes.find(c => c.id === insp.craneId);
    return insp.items
      .filter(i => i.result === 'defect' && i.defect)
      .map(item => {
        let itemLabel = '';
        if (template) {
          for (const sec of template.sections) {
            const found = sec.items.find(ti => ti.id === item.templateItemId);
            if (found) { itemLabel = found.label; break; }
          }
        }
        return { inspection: insp, item, crane, itemLabel };
      });
  });

  // Use DB defects if available, otherwise fallback to context
  const hasDbDefects = dbDefects.length > 0;
  const totalDefectCount = hasDbDefects ? dbDefects.length : allDefects.length;

  const updateDbDefect = (responseId: string, updates: Partial<DbDefect>) => {
    setDbDefects(prev => prev.map(d => d.responseId === responseId ? { ...d, ...updates } : d));
  };

  const updateLiftingDefect = (id: string, updates: Partial<LiftingDefect>) => {
    setLiftingDefects(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const toggleDefect = (id: string) => {
    setExpandedDefects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [creatingDraftQuote, setCreatingDraftQuote] = useState(false);
  const [draftQuoteCreated, setDraftQuoteCreated] = useState(false);

  const handleSaveDefects = async () => {
    // Get Fix Now defects from DB defects
    const fixNowDefects = dbDefects.filter(d => d.quoteStatus === 'Quote Now');

    if (fixNowDefects.length > 0) {
      setCreatingDraftQuote(true);
      try {
        const LABOUR_COST_RATE = 117;
        const LABOUR_SELL_RATE = 195;

        const lineItems = fixNowDefects.map((d, i) => ({
          id: `defect-${i}`,
          category: 'labour' as const,
          description: `${d.assetName} — ${d.questionText}${d.comment ? ': ' + d.comment : ''}${d.quoteInstructions ? ' [Internal: ' + d.quoteInstructions + ']' : ''}`,
          quantity: 1,
          costPrice: LABOUR_COST_RATE,
          sellPrice: LABOUR_SELL_RATE,
          gstIncluded: false,
        }));

        const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
        const gst = subtotal * 0.10;
        const total = subtotal + gst;

        const { error } = await supabase.from('quotes').insert({
          client_name: clientInfo?.client_name || site.name,
          site_name: site.name,
          technician_id: state.currentUser?.id || 'unknown',
          technician_name: state.currentUser?.name || 'Technician',
          subtotal,
          gst,
          total,
          status: 'not_sent',
          items: lineItems as any,
        });

        if (error) throw error;
        setDraftQuoteCreated(true);
        toast.success(`Draft quote created with ${fixNowDefects.length} Fix Now defect${fixNowDefects.length !== 1 ? 's' : ''} — check Quotes page to review & send`);
      } catch (err: any) {
        console.error('Draft quote error:', err);
        toast.error(`Failed to create draft quote: ${err.message}`);
      } finally {
        setCreatingDraftQuote(false);
      }
    }

    setDefectsSaved(true);
    setDefectsExpanded(false);
    setTimeout(() => {
      const el = document.getElementById('next-inspection-date');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const quoteNowDefects = allDefects.filter(d => d.item.defect?.quoteStatus === 'Quote Now');

  const handleSendToAroflo = async () => {
    if (quoteNowDefects.length === 0) {
      toast.error('No defects marked as "Quote Now"');
      return;
    }
    setSendingToAroflo(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-aroflo-quote', {
        body: {
          clientName: clientInfo?.client_name || site.name,
          siteName: site.name,
          siteAddress: clientInfo?.location_address || site.address,
          technicianName: state.currentUser?.name || 'Technician',
          jobDate: format(new Date(), 'yyyy-MM-dd'),
          defects: quoteNowDefects.map(d => ({
            itemLabel: d.itemLabel,
            craneName: d.crane?.name || 'Unknown',
            severity: d.item.defect!.severity,
            defectType: d.item.defect!.defectType,
            rectificationTimeframe: d.item.defect!.rectificationTimeframe,
            notes: d.item.defect!.notes || '',
            recommendedAction: d.item.defect!.recommendedAction || '',
          })),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      setArofloQuoteSent(true);
      toast.success(data.message || 'Draft quote created in AroFlo');
    } catch (err: any) {
      console.error('AroFlo quote error:', err);
      toast.error(`Failed to create AroFlo quote: ${err.message}`);
    } finally {
      setSendingToAroflo(false);
    }
  };

  const buildSummaryPayload = () => ({
    siteId: site.id,
    inspectionIds: completedInspections.map(i => i.id),
    nextInspectionDate: nextDate,
    nextInspectionTime: nextTime,
    bookingConfirmed,
    customerName,
    customerSignature: customerSig,
    technicianSignature: techSig,
    rating: rating || undefined,
    feedback: feedback || undefined,
    publishTestimonial,
    completedAt: new Date().toISOString(),
  });

  const handleSubmit = async () => {
    setSending(true);
    try {
      const summaryPayload = buildSummaryPayload();
      dispatch({ type: 'SAVE_SITE_JOB_SUMMARY', payload: summaryPayload });

      // Generate PDF
      const template = state.templates[0];
      const pdf = await generateJobPdf({
        site,
        clientInfo: clientInfo || undefined,
        technicianName: state.currentUser?.name || 'Technician',
        jobType,
        inspections: completedInspections,
        template,
        summary: summaryPayload,
        customerDefectComments,
        liftingDefects: liftingDefects.length > 0 ? liftingDefects : undefined,
      });

      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const clientNameSafe = (clientInfo?.client_name || site.name).replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = format(new Date(), 'yyyyMMdd');
      const filename = `${clientNameSafe}_ServiceReport_${dateStr}.pdf`;

      // Also download a copy locally
      pdf.save(filename);

      // Send email if we have a recipient
      const recipientEmail = clientInfo?.primary_contact_email;
      if (recipientEmail) {
        const { data, error } = await supabase.functions.invoke('send-report', {
          body: {
            to: recipientEmail,
            clientName: clientInfo?.primary_contact_name || customerName,
            siteName: clientInfo?.client_name || site.name,
            pdfBase64,
            filename,
          },
        });

        if (error) {
          console.error('Email send error:', error);
          toast.error('Report downloaded but email failed to send. Check the email address.');
        } else {
          toast.success(`Report emailed to ${recipientEmail}`);
        }
      } else {
        toast.info('Report downloaded. No client email on file — email not sent.');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Something went wrong. Report may not have been sent.');
    } finally {
      setSending(false);
    }
  };

  const handlePreviewPdf = async () => {
    setGeneratingPreview(true);
    try {
      const template = state.templates[0];
      const pdf = await generateJobPdf({
        site,
        clientInfo: clientInfo || undefined,
        technicianName: state.currentUser?.name || 'Technician',
        jobType,
        inspections: completedInspections,
        template,
        summary: buildSummaryPayload(),
        customerDefectComments,
        liftingDefects: liftingDefects.length > 0 ? liftingDefects : undefined,
      });
      setPreviewPdfDoc(pdf);
    } catch (err: any) {
      console.error('Preview PDF error:', err);
      toast.error('Failed to generate preview');
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleDownloadPreviewPdf = () => {
    if (!previewPdfDoc) return;
    const clientName = (clientInfo?.client_name || site.name).replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = format(new Date(), 'yyyyMMdd');
    previewPdfDoc.save(`${clientName}_ServiceReport_${dateStr}.pdf`);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title="Job Complete" onBack={() => dispatch({ type: 'BACK_TO_SITES' })} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-rka-green-light flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-rka-green" />
            </div>
            <h2 className="text-2xl font-black mb-2">Job Complete</h2>
            <p className="text-muted-foreground">Report sent to customer</p>
            <p className="text-sm text-muted-foreground mt-1">
              Next inspection: {format(new Date(nextDate), 'dd MMM yyyy')}
            </p>
            <button
              onClick={() => dispatch({ type: 'BACK_TO_SITES' })}
              className="mt-6 tap-target px-8 bg-primary text-primary-foreground rounded-xl font-bold text-base"
            >
              Back to Sites
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Site Job Summary"
        subtitle={site.name}
        onBack={() => dispatch({ type: 'BACK_TO_CRANES' })}
        onNoteToAdmin={() => setNoteOpen(true)}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Job Report Header */}
        <div className="px-4 py-4 border-b border-border bg-muted/30 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground italic">
            Australian Standards Reference: AS 2550 – Safe Use of Cranes | AS 1418 – Cranes, Hoists &amp; Winches | AS 4991 – Lifting Devices
          </p>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business Name</label>
              <p className="text-sm font-bold mt-0.5">RKA Crane Services</p>
            </div>

            {/* Client Info Section - driven by admin config */}
            {clientInfo && (
              <ClientInfoSummarySection
                clientInfo={clientInfo}
                clientContacts={clientContacts}
                adminConfig={state.adminConfig}
                onUpdateClientInfo={(updates) => {
                  setClientInfo((prev: any) => ({ ...prev, ...updates }));
                  // Save to DB
                  if (clientInfo?.id) {
                    supabase.from('clients').update(updates).eq('id', clientInfo.id).then(({ error }) => {
                      if (error) toast.error('Failed to save client info');
                    });
                  }
                }}
              />
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Site Address</label>
              <p className="text-sm font-medium mt-0.5">{clientInfo?.location_address || site.address}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full tap-target px-4 border border-border rounded-xl bg-background text-sm font-medium mt-1 appearance-none cursor-pointer"
              >
                <option value="Periodic Inspection">Periodic Inspection</option>
                <option value="Repair">Repair</option>
                <option value="Breakdown / Fault">Breakdown / Fault</option>
                <option value="Commissioning">Commissioning</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician Name</label>
              <p className="text-sm font-medium mt-0.5">{state.currentUser?.name || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date and Time Scheduled</label>
              <p className="text-sm font-medium mt-0.5">{format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </div>
        </div>

        {/* Completed Inspections Summary */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completed Inspections</p>
          {completedInspections.map(insp => {
            const crane = site.cranes.find(c => c.id === insp.craneId);
            const defectCount = insp.items.filter(i => i.result === 'defect').length;
            return (
              <div key={insp.id} className="flex items-center justify-between py-2">
                <span className="font-medium text-sm">{crane?.name}</span>
                <div className="flex items-center gap-2">
                  {defectCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rka-red-light text-rka-red">
                      {defectCount} defect{defectCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Defect Review for Customer */}
        {(totalDefectCount > 0 || dbDefectsLoading) && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Defects Found — Customer Review ({totalDefectCount})
              </p>
              {defectsSaved && (
                <button
                  onClick={() => { setDefectsExpanded(!defectsExpanded); }}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
                  {defectsExpanded ? 'Collapse' : 'Edit Defects'}
                  {defectsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>

            {dbDefectsLoading && (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading defects…
              </div>
            )}

            {defectsSaved && !defectsExpanded && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rka-green-light mb-2">
                <CheckCircle className="w-5 h-5 text-rka-green" />
                <p className="text-sm font-bold text-rka-green-dark">Defect details saved</p>
              </div>
            )}

            {defectsExpanded && !dbDefectsLoading && (
              <>
                {/* Database defects */}
                {hasDbDefects && dbDefects.map((defect) => {
                  const isExpanded = expandedDefects.has(defect.responseId);
                  const severityColor = defect.severity === 'Critical' || defect.urgency === 'Immediate'
                    ? 'bg-rka-red-light'
                    : defect.severity === 'Major' || defect.urgency === 'Urgent'
                    ? 'bg-rka-orange-light'
                    : 'bg-rka-yellow/20';
                  const severityTextColor = defect.severity === 'Critical' || defect.urgency === 'Immediate'
                    ? 'text-rka-red'
                    : defect.severity === 'Major' || defect.urgency === 'Urgent'
                    ? 'text-rka-orange'
                    : 'text-rka-yellow';

                  return (
                    <div key={defect.responseId} className="mb-3 border border-border rounded-xl overflow-hidden bg-background">
                      <button
                        onClick={() => toggleDefect(defect.responseId)}
                        className="w-full px-4 py-3 flex items-start gap-3 text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${severityColor}`}>
                          <AlertTriangle className={`w-4 h-4 ${severityTextColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{defect.questionText}</p>
                          <p className="text-xs text-muted-foreground">{defect.assetName}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {defect.urgency && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                defect.urgency === 'Immediate' ? 'bg-rka-red text-destructive-foreground' :
                                defect.urgency === 'Urgent' ? 'bg-rka-orange text-destructive-foreground' :
                                'bg-muted text-foreground'
                              }`}>{defect.urgency}</span>
                            )}
                            {defect.severity && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                defect.severity === 'Critical' ? 'bg-rka-red text-destructive-foreground' :
                                defect.severity === 'Major' ? 'bg-rka-orange text-destructive-foreground' :
                                'bg-rka-yellow text-foreground'
                              }`}>{defect.severity}</span>
                            )}
                            {defect.defectTypes.map((dt, i) => (
                              <span key={i} className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">{dt}</span>
                            ))}
                          </div>
                          {defect.comment && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic">"{defect.comment}"</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />}
                      </button>

                      {/* Photos */}
                      {defect.photoUrls.length > 0 && (
                        <div className="px-4 pb-2">
                          <div className="flex gap-2 flex-wrap">
                            {defect.photoUrls.map((p, i) => (
                              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border shadow-sm cursor-pointer" onClick={() => setPreviewPhoto(p)}>
                                <img src={p} alt={`Defect photo ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 bg-foreground/60 text-background rounded-tr-lg p-1">
                                  <ZoomIn className="w-3 h-3" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded details */}
                      {isExpanded && defect.advancedDefectDetail.length > 0 && (
                        <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Defect Details</p>
                          <div className="flex flex-wrap gap-1.5">
                            {defect.advancedDefectDetail.map((d, i) => (
                              <span key={i} className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fix Now / Quote Later */}
                      <div className="flex gap-2 px-4 pb-2">
                        <button
                          onClick={() => updateDbDefect(defect.responseId, { quoteStatus: 'Quote Now' })}
                          className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                            defect.quoteStatus === 'Quote Now'
                              ? 'bg-rka-green text-primary-foreground'
                              : 'bg-muted text-foreground active:bg-foreground/10'
                          }`}
                        >
                          {defect.quoteStatus === 'Quote Now' && <Check className="w-4 h-4 inline mr-1" />}
                          Fix Now
                        </button>
                        <button
                          onClick={() => updateDbDefect(defect.responseId, { quoteStatus: 'Quote Later' })}
                          className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                            defect.quoteStatus === 'Quote Later'
                              ? 'bg-foreground text-background'
                              : 'bg-muted text-foreground active:bg-foreground/10'
                          }`}
                        >
                          {defect.quoteStatus === 'Quote Later' && <Check className="w-4 h-4 inline mr-1" />}
                          Quote Later
                        </button>
                      </div>

                      {/* Per-defect customer comment */}
                      <div className="px-4 pb-2">
                        <textarea
                          value={defect.customerComment || ''}
                          onChange={(e) => updateDbDefect(defect.responseId, { customerComment: e.target.value })}
                          placeholder="Customer comment on this defect (optional)..."
                          className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
                          rows={2}
                        />
                      </div>

                      {/* Internal quote instructions */}
                      <div className="px-4 pb-3">
                        <div className="p-2.5 rounded-lg bg-rka-orange-light border border-rka-orange/20">
                          <label className="text-[10px] font-bold text-rka-orange uppercase tracking-wide flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3 h-3" /> Internal — Quote Instructions (Admin Only)
                          </label>
                          <textarea
                            value={defect.quoteInstructions || ''}
                            onChange={(e) => updateDbDefect(defect.responseId, { quoteInstructions: e.target.value })}
                            placeholder="Parts needed, access notes, pricing guidance, scope of work details..."
                            className="w-full p-2 border border-rka-orange/20 rounded-lg bg-background text-sm resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Legacy context defects (fallback when no DB defects) */}
                {!hasDbDefects && allDefects.map(({ inspection: insp, item, crane, itemLabel }) => {
                  const isExpanded = expandedDefects.has(item.templateItemId);
                  const defectPhotos = item.defect?.photos || [];
                  return (
                    <div key={`${insp.id}-${item.templateItemId}`} className="mb-3 border border-border rounded-xl overflow-hidden bg-background">
                      <button
                        onClick={() => toggleDefect(item.templateItemId)}
                        className="w-full px-4 py-3 flex items-start gap-3 text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.defect!.severity === 'Critical' ? 'bg-rka-red-light' :
                          item.defect!.severity === 'Major' ? 'bg-rka-orange-light' : 'bg-rka-yellow/20'
                        }`}>
                          <AlertTriangle className={`w-4 h-4 ${
                            item.defect!.severity === 'Critical' ? 'text-rka-red' :
                            item.defect!.severity === 'Major' ? 'text-rka-orange' : 'text-rka-yellow'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{itemLabel}</p>
                          <p className="text-xs text-muted-foreground">{crane?.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              item.defect!.severity === 'Critical' ? 'bg-rka-red text-destructive-foreground' :
                              item.defect!.severity === 'Major' ? 'bg-rka-orange text-destructive-foreground' :
                              'bg-rka-yellow text-foreground'
                            }`}>{item.defect!.severity}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">{item.defect!.defectType}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">{item.defect!.rectificationTimeframe}</span>
                          </div>
                          {item.defect!.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic">"{item.defect!.notes}"</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />}
                      </button>

                      {defectPhotos.length > 0 && (
                        <div className="px-4 pb-2">
                          <div className="flex gap-2 flex-wrap">
                            {defectPhotos.map((p, i) => (
                              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border shadow-sm cursor-pointer" onClick={() => setPreviewPhoto(p)}>
                                <img src={p} alt={`Defect photo ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 bg-foreground/60 text-background rounded-tr-lg p-1">
                                  <ZoomIn className="w-3 h-3" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                          {item.defect!.notes && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Technician Comment</p>
                              <p className="text-sm">{item.defect!.notes}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 px-4 pb-2">
                        <button
                          onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Now', inspectionId: insp.id } })}
                          className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                            item.defect!.quoteStatus === 'Quote Now'
                              ? 'bg-rka-green text-primary-foreground'
                              : 'bg-muted text-foreground active:bg-foreground/10'
                          }`}
                        >
                          {item.defect!.quoteStatus === 'Quote Now' && <Check className="w-4 h-4 inline mr-1" />}
                          Fix Now
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Later', inspectionId: insp.id } })}
                          className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                            item.defect!.quoteStatus === 'Quote Later'
                              ? 'bg-foreground text-background'
                              : 'bg-muted text-foreground active:bg-foreground/10'
                          }`}
                        >
                          {item.defect!.quoteStatus === 'Quote Later' && <Check className="w-4 h-4 inline mr-1" />}
                          Quote Later
                        </button>
                      </div>

                      <div className="px-4 pb-2">
                        <textarea
                          value={item.defect!.customerComment || ''}
                          onChange={(e) => dispatch({ type: 'UPDATE_DEFECT_DETAIL', payload: { itemId: item.templateItemId, updates: { customerComment: e.target.value }, inspectionId: insp.id } })}
                          placeholder="Customer comment on this defect (optional)..."
                          className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
                          rows={2}
                        />
                      </div>

                      <div className="px-4 pb-3">
                        <div className="p-2.5 rounded-lg bg-rka-orange-light border border-rka-orange/20">
                          <label className="text-[10px] font-bold text-rka-orange uppercase tracking-wide flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3 h-3" /> Internal — Quote Instructions (Admin Only)
                          </label>
                          <textarea
                            value={item.defect!.quoteInstructions || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_DEFECT_DETAIL', payload: { itemId: item.templateItemId, updates: { quoteInstructions: e.target.value }, inspectionId: insp.id } })}
                            placeholder="Parts needed, access notes, pricing guidance, scope of work details..."
                            className="w-full p-2 border border-rka-orange/20 rounded-lg bg-background text-sm resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Customer comments about defects/quotes */}
                <div className="mb-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Comments on Defects / Quotes (optional)</label>
                  <textarea
                    value={customerDefectComments}
                    onChange={(e) => setCustomerDefectComments(e.target.value)}
                    placeholder="Any additional info about defects, when quote later items should be done, general comments..."
                    className="w-full p-3 border border-border rounded-xl bg-background text-sm resize-none mt-1"
                    rows={3}
                  />
                </div>

                {/* Save defects button */}
                <button
                  onClick={handleSaveDefects}
                  disabled={creatingDraftQuote}
                  className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  {creatingDraftQuote ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating Draft Quote...</>
                  ) : (
                    <><Check className="w-5 h-5" /> Save Defect Details{dbDefects.filter(d => d.quoteStatus === 'Quote Now').length > 0 ? ` & Create Draft Quote (${dbDefects.filter(d => d.quoteStatus === 'Quote Now').length})` : ''}</>
                  )}
                </button>

                {/* Send Quote Now defects to AroFlo */}
                {quoteNowDefects.length > 0 && (
                  <button
                    onClick={handleSendToAroflo}
                    disabled={sendingToAroflo || arofloQuoteSent}
                    className={`w-full tap-target rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-2 ${
                      arofloQuoteSent
                        ? 'bg-rka-green text-primary-foreground'
                        : 'bg-rka-orange text-destructive-foreground'
                    }`}
                  >
                    {sendingToAroflo ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Sending to AroFlo...</>
                    ) : arofloQuoteSent ? (
                      <><CheckCircle className="w-5 h-5" /> Quote Sent to AroFlo</>
                    ) : (
                      <><ExternalLink className="w-5 h-5" /> Send {quoteNowDefects.length} Defect{quoteNowDefects.length !== 1 ? 's' : ''} to AroFlo as Quote</>
                    )}
                  </button>
                )}

                {/* Create full quote on the spot */}
                {quoteNowDefects.length > 0 && onCreateQuote && (
                  <button
                    onClick={() => onCreateQuote(quoteNowDefects.map(d => ({
                      itemLabel: d.itemLabel,
                      craneName: d.crane?.name || 'Unknown',
                      severity: d.item.defect!.severity,
                      defectType: d.item.defect!.defectType,
                      notes: d.item.defect!.notes || '',
                      recommendedAction: d.item.defect!.recommendedAction || '',
                    })))}
                    className="w-full tap-target py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-2"
                  >
                    <FileText className="w-5 h-5" />
                    Create Full Quote on the Spot
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Lifting Equipment Defects */}
        {(liftingDefects.length > 0 || liftingDefectsLoading) && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-destructive" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Lifting Equipment — Failed / Flagged Items ({liftingDefects.length})
              </p>
            </div>

            {liftingDefectsLoading && (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading lifting equipment…
              </div>
            )}

            {!liftingDefectsLoading && liftingDefects.map((item) => (
              <div key={item.id} className="mb-3 border border-border rounded-xl overflow-hidden bg-background">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{item.equipment_type}</p>
                    <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                      {item.serial_number && <p>SN: {item.serial_number}</p>}
                      {item.asset_tag && <p>Tag: {item.asset_tag}</p>}
                      {item.wll_value && <p className="font-medium text-foreground">WLL: {item.wll_value} {item.wll_unit || 'kg'}</p>}
                      {item.manufacturer && <p>{item.manufacturer}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {item.equipment_status === 'Failed' && (
                        <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                      )}
                      {item.equipment_status === 'Removed From Service' && (
                        <Badge variant="destructive" className="text-[10px]">Removed From Service</Badge>
                      )}
                      {(item.tag_present === 'false' || item.tag_present === 'illegible') && (
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                          Tag {item.tag_present === 'false' ? 'Missing' : 'Illegible'}
                        </Badge>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">"{item.notes}"</p>
                    )}
                  </div>
                </div>

                {/* Quote Now / Quote Later */}
                <div className="flex gap-2 px-4 pb-2">
                  <button
                    onClick={() => updateLiftingDefect(item.id, { quoteStatus: 'Quote Now' })}
                    className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                      item.quoteStatus === 'Quote Now'
                        ? 'bg-rka-green text-primary-foreground'
                        : 'bg-muted text-foreground active:bg-foreground/10'
                    }`}
                  >
                    {item.quoteStatus === 'Quote Now' && <Check className="w-4 h-4 inline mr-1" />}
                    Quote Now
                  </button>
                  <button
                    onClick={() => updateLiftingDefect(item.id, { quoteStatus: 'Quote Later' })}
                    className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                      item.quoteStatus === 'Quote Later'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground active:bg-foreground/10'
                    }`}
                  >
                    {item.quoteStatus === 'Quote Later' && <Check className="w-4 h-4 inline mr-1" />}
                    Quote Later
                  </button>
                </div>

                {/* Customer comment */}
                <div className="px-4 pb-2">
                  <textarea
                    value={item.customerComment || ''}
                    onChange={(e) => updateLiftingDefect(item.id, { customerComment: e.target.value })}
                    placeholder="Customer comment (optional)..."
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
                    rows={2}
                  />
                </div>

                {/* Internal instructions */}
                <div className="px-4 pb-3">
                  <div className="p-2.5 rounded-lg bg-rka-orange-light border border-rka-orange/20">
                    <label className="text-[10px] font-bold text-rka-orange uppercase tracking-wide flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" /> Internal — Quote Instructions
                    </label>
                    <textarea
                      value={item.quoteInstructions || ''}
                      onChange={(e) => updateLiftingDefect(item.id, { quoteInstructions: e.target.value })}
                      placeholder="Replacement item details, supplier info, shop link..."
                      className="w-full p-2 border border-rka-orange/20 rounded-lg bg-background text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Future: Shop link placeholder */}
                <div className="px-4 pb-3">
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-muted/50 text-muted-foreground text-xs font-medium opacity-60"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Link to Shop Item (Coming Soon)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {completedInspections.some(i => i.craneStatus) && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Asset Operational Status</p>
            {completedInspections.map(insp => {
              const crane = site.cranes.find(c => c.id === insp.craneId);
              if (!insp.craneStatus) return null;
              return (
                <div key={insp.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-sm">{crane?.name}</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    insp.craneStatus === 'Safe to Operate' ? 'bg-rka-green text-primary-foreground' :
                    insp.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red text-destructive-foreground' :
                    'bg-rka-orange text-destructive-foreground'
                  }`}>
                    {insp.craneStatus}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Next Inspection - filled by technician */}
          <div id="next-inspection-date">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Inspection Date</label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="w-full tap-target px-4 border border-border rounded-xl bg-background text-base mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</label>
            <input
              type="time"
              value={nextTime}
              onChange={(e) => setNextTime(e.target.value)}
              className="w-full tap-target px-4 border border-border rounded-xl bg-background text-base mt-1"
            />
          </div>

          {/* ── Customer Section ── */}
          <div className="border-t-2 border-primary/30 pt-4 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold text-primary uppercase tracking-wide">Customer to Complete</p>
            </div>

            {/* Confirm Booking */}
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm Booking</label>
                {!bookingConfirmed && <span className="text-xs font-bold text-rka-red">Required</span>}
              </div>
              <button
                onClick={() => setBookingConfirmed(!bookingConfirmed)}
                className={`w-full tap-target rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  bookingConfirmed
                    ? 'bg-rka-green text-primary-foreground'
                    : 'bg-muted text-foreground ring-2 ring-primary/40'
                }`}
              >
                {bookingConfirmed && <Check className="w-5 h-5" />}
                {bookingConfirmed ? 'Calendar Invite Sent and Booking Confirmed ✓' : 'Confirm Booking & Send Calendar Invite'}
              </button>
            </div>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full tap-target px-4 border border-border rounded-xl bg-background text-base mt-1"
              />
            </div>

            {/* Customer Signature */}
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Signature</span>
                {!customerSig && <span className="text-xs font-bold text-rka-red">Required</span>}
              </div>
              <div className={`rounded-xl ${!customerSig ? 'ring-2 ring-primary/40' : ''}`}>
                <SignaturePad label="" onSave={setCustomerSig} />
              </div>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rating</label>
                {rating === 0 && <span className="text-xs font-bold text-rka-red">Required</span>}
              </div>
              <div className={`flex gap-2 p-2 rounded-xl ${rating === 0 ? 'ring-2 ring-primary/40 bg-muted/30' : ''}`}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="tap-target flex items-center justify-center"
                  >
                    <Star
                      className={`w-8 h-8 transition-all ${
                        star <= rating ? 'fill-rka-yellow text-rka-yellow' : 'text-border'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating === 5 && (
                <div className="mt-3 p-4 rounded-xl bg-rka-green-light text-center space-y-3">
                  <p className="text-sm font-bold text-rka-green-dark">
                    Thank you for your rating, please give us a Google Review here!
                  </p>
                  <img src={rkaReviewQr} alt="Scan to leave a Google Review" className="w-32 h-32 mx-auto rounded-lg" />
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(GOOGLE_REVIEW_URL, '_blank', 'noopener,noreferrer');
                    }}
                    className="inline-block text-sm font-bold text-primary underline"
                  >
                    Tap here to leave a review →
                  </a>
                </div>
              )}
            </div>

            {/* Customer Feedback */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Any feedback or comments from the customer..."
                className="w-full p-3 border border-border rounded-xl bg-background text-sm resize-none mt-1"
                rows={3}
              />
            </div>

            {/* Testimonial Checkbox - default ticked */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 mb-4">
              <Checkbox
                id="testimonial"
                checked={publishTestimonial}
                onCheckedChange={(checked) => setPublishTestimonial(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="testimonial" className="text-sm font-medium leading-snug cursor-pointer">
                I give permission to publish my feedback as a testimonial
              </label>
            </div>
          </div>

          {/* ── Technician Section ── */}
          <div className="border-t-2 border-border pt-4 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Technician to Complete</p>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician Signature</span>
              {!techSig && <span className="text-xs font-bold text-rka-red">Required</span>}
            </div>
            <div className={`rounded-xl ${!techSig ? 'ring-2 ring-primary/40' : ''}`}>
              <SignaturePad label="" onSave={setTechSig} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={handlePreviewPdf}
          disabled={generatingPreview}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          {generatingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {generatingPreview ? 'Generating Preview…' : 'Preview PDF Report'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!customerSig || !techSig || sending}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {sending ? 'Sending Report…' : 'Complete Job and Send Report'}
        </button>
        <button
          onClick={() => {/* TODO: generate shareable link */}}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-muted-foreground"
        >
          <Send className="w-4 h-4" />
          Send to Customer for Remote Sign-off
        </button>
      </div>

      {/* Fullscreen Photo Preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button className="absolute top-4 right-4 bg-background rounded-full p-2 shadow-lg" onClick={() => setPreviewPhoto(null)}>
            <X className="w-6 h-6 text-foreground" />
          </button>
          <img src={previewPhoto} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />

      <PdfPreviewModal
        open={!!previewPdfDoc}
        onClose={() => setPreviewPdfDoc(null)}
        pdfDoc={previewPdfDoc}
        onDownload={handleDownloadPreviewPdf}
        title="Service Report Preview"
      />
    </div>
  );
}
