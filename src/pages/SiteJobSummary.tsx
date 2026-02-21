import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { addDays, format } from 'date-fns';
import { Star, Check, AlertTriangle, Send, ChevronDown, ChevronUp, ZoomIn, X } from 'lucide-react';
import rkaReviewQr from '@/assets/rka-review-qr.png';

export default function SiteJobSummary() {
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
  const [publishTestimonial, setPublishTestimonial] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedDefects, setExpandedDefects] = useState<Set<string>>(new Set());
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

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

  const handleSubmit = () => {
    dispatch({
      type: 'SAVE_SITE_JOB_SUMMARY',
      payload: {
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
      },
    });
    setSubmitted(true);
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
            <p className="text-muted-foreground">Site job summary saved successfully</p>
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
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    insp.craneStatus === 'Safe to Operate' ? 'bg-rka-green-light text-rka-green-dark' :
                    insp.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                    'bg-rka-orange-light text-rka-orange'
                  }`}>
                    {insp.craneStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Defect Review for Customer */}
        {allDefects.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Defects Found — Customer Review ({allDefects.length})
            </p>
            {allDefects.map(({ inspection: insp, item, crane, itemLabel }) => {
              const isExpanded = expandedDefects.has(item.templateItemId);
              return (
                <div key={`${insp.id}-${item.templateItemId}`} className="mb-3 border border-border rounded-xl overflow-hidden bg-background">
                  {/* Defect header */}
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
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      {item.defect!.notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Comment</p>
                          <p className="text-sm">{item.defect!.notes}</p>
                        </div>
                      )}
                      {item.defect!.photos && item.defect!.photos.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photos</p>
                          <div className="flex gap-2 flex-wrap">
                            {item.defect!.photos.map((p, i) => (
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
                    </div>
                  )}

                  {/* Quote buttons always visible */}
                  <div className="flex gap-2 px-4 pb-3">
                    <button
                      onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Now' } })}
                      className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                        item.defect!.quoteStatus === 'Quote Now'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground active:bg-foreground/10'
                      }`}
                    >
                      Quote Now
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Later' } })}
                      className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                        item.defect!.quoteStatus === 'Quote Later'
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-foreground active:bg-foreground/10'
                      }`}
                    >
                      Quote Later
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Next Inspection - filled by technician */}
          <div>
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
                {bookingConfirmed ? 'Booking Confirmed ✓' : 'Confirm Booking & Send Calendar Invite'}
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

            {/* Testimonial Toggle */}
            <button
              onClick={() => setPublishTestimonial(!publishTestimonial)}
              className={`w-full tap-target rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                publishTestimonial
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {publishTestimonial ? <Check className="w-4 h-4" /> : null}
              Permission to publish testimonial
            </button>
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
          onClick={handleSubmit}
          disabled={!customerSig || !techSig}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base disabled:opacity-40"
        >
          Complete Site Job
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
