import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import {
  TimeEntry, TimeEntryType, ENTRY_TYPE_CONFIG,
  fetchTimeEntries, createTimeEntry, deleteTimeEntry,
  submitTimesheet, calculateHours,
} from '@/services/timesheetService';
import { Plus, X, Trash2, Send, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns';
import { toast } from 'sonner';

interface TimesheetPageProps {
  onBack: () => void;
}

export default function TimesheetPage({ onBack }: TimesheetPageProps) {
  const { state } = useApp();
  const techId = state.currentUser?.id || 'tech-1';
  const techName = state.currentUser?.name || '';

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Form state
  const [entryType, setEntryType] = useState<TimeEntryType>('inspection');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: wEnd });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchTimeEntries(techId, format(weekStart, 'yyyy-MM-dd'), format(wEnd, 'yyyy-MM-dd'));
      setEntries(data);
    } catch {
      toast.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEntries(); }, [weekStart, techId]);

  const dayEntries = (day: Date) => entries.filter(e => isSameDay(parseISO(e.entry_date), day));
  const dayTotal = (day: Date) => dayEntries(day).reduce((sum, e) => sum + Number(e.hours), 0);
  const weekTotal = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  const handleAdd = async () => {
    const hours = calculateHours(startTime, endTime);
    if (hours <= 0) { toast.error('End time must be after start time'); return; }
    setSubmitting(true);
    try {
      await createTimeEntry({
        technician_id: techId,
        technician_name: techName,
        entry_date: format(selectedDay, 'yyyy-MM-dd'),
        entry_type: entryType,
        start_time: startTime,
        end_time: endTime,
        hours,
        description: description || null,
        client_name: clientName || null,
        site_id: null,
        inspection_id: null,
        is_auto_logged: false,
      });
      toast.success(`${hours}h added`);
      resetForm();
      loadEntries();
    } catch {
      toast.error('Failed to add entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTimeEntry(id);
      toast.success('Entry removed');
      loadEntries();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSubmitWeek = async () => {
    try {
      await submitTimesheet(techId, techName, format(weekStart, 'yyyy-MM-dd'), format(wEnd, 'yyyy-MM-dd'), weekTotal);
      toast.success('Timesheet submitted for approval');
    } catch {
      toast.error('Failed to submit timesheet');
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEntryType('inspection');
    setStartTime('08:00');
    setEndTime('16:00');
    setDescription('');
    setClientName('');
  };

  const entryTypes: TimeEntryType[] = ['inspection', 'travel', 'repair', 'admin', 'training', 'other'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Timesheet" subtitle={`Week of ${format(weekStart, 'd MMM')}`} onBack={onBack} />

      {/* Week Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-sm font-bold text-primary">
          This Week
        </button>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week Summary Bar */}
      <div className="px-4 py-2 flex gap-1">
        {weekDays.map(day => {
          const total = dayTotal(day);
          const isSelected = isSameDay(day, selectedDay);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 rounded-lg py-2 text-center transition-all ${
                isSelected ? 'bg-primary text-primary-foreground'
                  : isToday(day) ? 'bg-primary/10 text-primary'
                  : 'bg-muted'
              }`}
            >
              <p className="text-[10px] font-bold">{format(day, 'EEE')}</p>
              <p className="text-sm font-bold">{format(day, 'd')}</p>
              {total > 0 && (
                <p className={`text-[10px] font-bold ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                  {total}h
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Week total */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold">Week Total</span>
        </div>
        <span className="text-lg font-bold text-primary">{weekTotal}h</span>
      </div>

      {/* Day entries */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {format(selectedDay, 'EEEE, d MMMM')} — {dayTotal(selectedDay)}h
          </p>
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1 text-xs font-bold text-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {loading ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>
        ) : dayEntries(selectedDay).length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No time logged</p>
            <p className="text-xs">Tap + to add an entry</p>
          </div>
        ) : (
          dayEntries(selectedDay).map(entry => {
            const cfg = ENTRY_TYPE_CONFIG[entry.entry_type];
            return (
              <div key={entry.id} className="bg-muted rounded-xl p-3 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{cfg.emoji} {cfg.label}</span>
                    {entry.is_auto_logged && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Auto</span>}
                  </div>
                  {entry.description && <p className="text-xs text-muted-foreground truncate">{entry.description}</p>}
                  {entry.client_name && <p className="text-[10px] text-muted-foreground">{entry.client_name}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {entry.start_time} – {entry.end_time}
                  </p>
                </div>
                <span className="text-sm font-bold text-foreground">{Number(entry.hours)}h</span>
                {!entry.is_auto_logged && (
                  <button onClick={() => handleDelete(entry.id)} className="p-1 text-muted-foreground active:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Add entry form */}
        {showAddForm && (
          <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Log Time</p>
              <button onClick={resetForm} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {entryTypes.map(t => {
                  const cfg = ENTRY_TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setEntryType(t)}
                      className={`p-2 rounded-lg border-2 text-center transition-all text-xs ${
                        entryType === t ? 'border-primary bg-primary/10 font-bold' : 'border-border bg-background'
                      }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Start</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">End</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-right">
              = <strong>{calculateHours(startTime, endTime)}h</strong>
            </p>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Client / Site (optional)</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="e.g. BHP Steelworks"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Description (optional)</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Quarterly inspection Bay 1"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
            </div>

            <button
              onClick={handleAdd}
              disabled={submitting}
              className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm py-3 disabled:opacity-40"
            >
              {submitting ? 'Adding...' : `Add ${calculateHours(startTime, endTime)}h`}
            </button>
          </div>
        )}
      </div>

      {/* Submit week */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={handleSubmitWeek}
          disabled={weekTotal === 0}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm py-3 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
          Submit Week ({weekTotal}h)
        </button>
        <p className="text-[10px] text-center text-muted-foreground">Xero sync available after admin approval</p>
      </div>
    </div>
  );
}
