import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LeaveType, LEAVE_TYPE_CONFIG, createLeaveRequest } from '@/services/leaveService';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface LeaveRequestFormProps {
  defaultDate?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function LeaveRequestForm({ defaultDate, onClose, onSubmitted }: LeaveRequestFormProps) {
  const { state } = useApp();
  const [leaveType, setLeaveType] = useState<LeaveType>('annual_leave');
  const [startDate, setStartDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!state.currentUser) return;
    setSubmitting(true);
    try {
      await createLeaveRequest({
        technician_id: state.currentUser.id,
        technician_name: state.currentUser.name,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        is_all_day: isAllDay,
        start_time: isAllDay ? null : startTime || null,
        end_time: isAllDay ? null : endTime || null,
        reason: reason || null,
      });
      toast.success('Leave request submitted for approval');
      onSubmitted();
    } catch (err) {
      toast.error('Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const leaveTypes: LeaveType[] = ['annual_leave', 'time_in_lieu', 'sick_leave', 'personal'];

  return (
    <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Request Leave</p>
        <button onClick={onClose} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Leave Type</label>
        <div className="grid grid-cols-2 gap-2">
          {leaveTypes.map(t => {
            const cfg = LEAVE_TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() => setLeaveType(t)}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                  leaveType === t ? 'border-primary bg-primary/10' : 'border-border bg-background'
                }`}
              >
                <span className="text-sm">{cfg.emoji} {cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)}
          className="rounded border-border" />
        All day
      </label>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Reason (optional)</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Family holiday, doctor appointment..."
          className="w-full p-2.5 border border-border rounded-lg bg-background text-sm h-16 resize-none" />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40"
      >
        {submitting ? 'Submitting...' : 'Submit Leave Request'}
      </button>
    </div>
  );
}
