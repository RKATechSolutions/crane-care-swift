import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { SignaturePad } from '@/components/SignaturePad';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { addDays, format } from 'date-fns';
import { Star, Check } from 'lucide-react';

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
  const [publishTestimonial, setPublishTestimonial] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

        <div className="p-4 space-y-5">
          {/* Next Inspection */}
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

          <button
            onClick={() => setBookingConfirmed(!bookingConfirmed)}
            className={`w-full tap-target rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              bookingConfirmed
                ? 'bg-rka-green text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {bookingConfirmed && <Check className="w-5 h-5" />}
            {bookingConfirmed ? 'Booking Confirmed' : 'Confirm Booking'}
          </button>

          {/* Customer Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full tap-target px-4 border border-border rounded-xl bg-background text-base mt-1"
            />
          </div>

          {/* Signatures */}
          <SignaturePad label="Customer Signature" onSave={setCustomerSig} />
          <SignaturePad label="Technician Signature" onSave={setTechSig} />

          {/* Rating */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Rating (optional)</label>
            <div className="flex gap-2">
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
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={!customerSig || !techSig}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base disabled:opacity-40"
        >
          Complete Site Job
        </button>
      </div>

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />
    </div>
  );
}
