import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { Checkbox } from '@/components/ui/checkbox';
import { addDays, format } from 'date-fns';
import { Star, Check, AlertTriangle, Send, ChevronDown, ChevronUp, ZoomIn, X, CheckCircle, Building2, Phone, Mail, User, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import rkaReviewQr from '@/assets/rka-review-qr.png';
import { supabase } from '@/integrations/supabase/client';
import { generateJobPdf } from '@/utils/generateJobPdf';
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

  // Client info from database
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [clientContacts, setClientContacts] = useState<any[]>([]);

  useEffect(() => {
    const fetchClient = async () => {
      // Try exact match first, then progressively broader matches
      const searchTerms = [
        site.name,
        site.name.split(' - ')[0], // e.g. "Bluescope Steel" from "Bluescope Steel - Western Port"
        site.name.split(' ')[0],   // e.g. "Bluescope"
      ];

      let matched: any = null;
      for (const term of searchTerms) {
        if (!term || term.length < 3) continue;
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .ilike('client_name', `%${term}%`)
          .limit(1);

        if (clients && clients.length > 0) {
          matched = clients[0];
          break;
        }
      }

      if (matched) {
        setClientInfo(matched);
        setCustomerName(matched.primary_contact_name || site.contactName);

        const { data: contacts } = await supabase
          .from('client_contacts')
          .select('*')
          .eq('client_id', matched.id)
          .eq('status', 'Active');

        if (contacts) setClientContacts(contacts);
      }
    };
    fetchClient();
  }, [site.name]);

  // Gather all defects across completed inspections
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

  const toggleDefect = (id: string) => {
    setExpandedDefects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveDefects = () => {
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
    });
    // Download PDF directly (avoids Chrome popup blocker)
    const clientName = (clientInfo?.client_name || site.name).replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = format(new Date(), 'yyyyMMdd');
    pdf.save(`${clientName}_ServiceReport_${dateStr}.pdf`);
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

            {/* Client Info Section */}
            {clientInfo && (
              <div className="border border-primary/20 rounded-xl p-3 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-primary" />
                  <label className="text-xs font-semibold text-primary uppercase tracking-wide">Client Information</label>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client Name</label>
                  <p className="text-sm font-bold mt-0.5">{clientInfo.client_name}</p>
                </div>
                {clientInfo.primary_contact_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Primary Contact</label>
                      <p className="text-sm font-medium">{clientInfo.primary_contact_name}</p>
                    </div>
                  </div>
                )}
                {clientInfo.primary_contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{clientInfo.primary_contact_email}</p>
                  </div>
                )}
                {clientInfo.primary_contact_mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">{clientInfo.primary_contact_mobile}</p>
                  </div>
                )}
                {clientInfo.site_induction_details && (
                  <div className="mt-1 p-2 rounded-lg bg-rka-orange-light">
                    <label className="text-xs font-semibold text-rka-orange uppercase tracking-wide">⚠️ Site Induction</label>
                    <p className="text-sm font-medium mt-0.5">{clientInfo.site_induction_details}</p>
                  </div>
                )}
                {clientContacts.length > 0 && (
                  <div className="mt-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other Contacts</label>
                    <div className="space-y-1 mt-1">
                      {clientContacts.slice(0, 3).map((c, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{c.contact_name}</span>
                          {c.contact_position && <span className="ml-1">({c.contact_position})</span>}
                          {c.contact_email && <span className="ml-1">• {c.contact_email}</span>}
                        </div>
                      ))}
                      {clientContacts.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{clientContacts.length - 3} more contacts</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
        {allDefects.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Defects Found — Customer Review ({allDefects.length})
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

            {defectsSaved && !defectsExpanded && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rka-green-light mb-2">
                <CheckCircle className="w-5 h-5 text-rka-green" />
                <p className="text-sm font-bold text-rka-green-dark">Defect details saved</p>
              </div>
            )}

            {defectsExpanded && (
              <>
                {allDefects.map(({ inspection: insp, item, crane, itemLabel }) => {
                  const isExpanded = expandedDefects.has(item.templateItemId);
                  const defectPhotos = item.defect?.photos || [];
                  return (
                    <div key={`${insp.id}-${item.templateItemId}`} className="mb-3 border border-border rounded-xl overflow-hidden bg-background">
                      {/* Defect header - always show photos inline */}
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
                          {/* Show comment from technician */}
                          {item.defect!.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic">"{item.defect!.notes}"</p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />}
                      </button>

                      {/* Photos always visible outside dropdown */}
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

                      {/* Expanded details */}
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

                      {/* Quote buttons always visible */}
                      <div className="flex gap-2 px-4 pb-3">
                        <button
                          onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Now', inspectionId: insp.id } })}
                          className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                            item.defect!.quoteStatus === 'Quote Now'
                              ? 'bg-rka-green text-primary-foreground'
                              : 'bg-muted text-foreground active:bg-foreground/10'
                          }`}
                        >
                          {item.defect!.quoteStatus === 'Quote Now' && <Check className="w-4 h-4 inline mr-1" />}
                          Quote Now
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
                  className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Save Defect Details
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

        {/* Crane Status Summary */}
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
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Preview PDF Report
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
    </div>
  );
}
