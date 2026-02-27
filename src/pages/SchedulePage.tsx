import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { ScheduleEvent, ScheduleEventType, EVENT_TYPE_CONFIG } from '@/types/schedule';
import { mockScheduleEvents } from '@/data/mockSchedule';
import { fetchLeaveRequests, LeaveRequest, LEAVE_TYPE_CONFIG } from '@/services/leaveService';
import LeaveRequestForm from '@/components/LeaveRequestForm';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Plus, X, Palmtree } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns';

interface SchedulePageProps {
  onBack: () => void;
}

export default function SchedulePage({ onBack }: SchedulePageProps) {
  const { state } = useApp();
  const techId = state.currentUser?.id || 'tech-1';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>(mockScheduleEvents);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const loadLeave = async () => {
    try {
      const data = await fetchLeaveRequests(techId);
      setLeaveRequests(data);
    } catch {}
  };

  useEffect(() => { loadLeave(); }, [techId]);

  // Add event form state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<ScheduleEventType>('personal');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEndDate, setNewEndDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newIsAllDay, setNewIsAllDay] = useState(false);
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newNotes, setNewNotes] = useState('');

  // Filter events for current technician
  const myEvents = events.filter(e => e.technicianId === techId);

  const isEventOnDay = (event: ScheduleEvent, day: Date) => {
    const eventDate = parseISO(event.date);
    if (event.endDate) {
      const end = parseISO(event.endDate);
      return isWithinInterval(day, { start: eventDate, end: end }) || isSameDay(day, eventDate) || isSameDay(day, end);
    }
    return isSameDay(day, eventDate);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedEvents = myEvents.filter(e => isEventOnDay(e, selectedDate));

  const handleAddEvent = () => {
    if (!newTitle.trim()) return;
    const event: ScheduleEvent = {
      id: `evt-${Date.now()}`,
      technicianId: techId,
      technicianName: state.currentUser?.name || '',
      title: newTitle.trim(),
      date: newDate,
      endDate: newEndDate || undefined,
      time: newIsAllDay ? undefined : newTime || undefined,
      endTime: newIsAllDay ? undefined : newEndTime || undefined,
      type: newType,
      isAllDay: newIsAllDay,
      isPrivate: newIsPrivate,
      notes: newNotes || undefined,
    };
    setEvents(prev => [...prev, event]);
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewTitle('');
    setNewType('personal');
    setNewDate(format(selectedDate, 'yyyy-MM-dd'));
    setNewEndDate('');
    setNewTime('');
    setNewEndTime('');
    setNewIsAllDay(false);
    setNewIsPrivate(false);
    setNewNotes('');
    setShowAddEvent(false);
  };

  const allowedTechTypes: ScheduleEventType[] = ['annual_leave', 'time_in_lieu', 'personal', 'sick_leave'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="My Schedule" subtitle={format(currentMonth, 'MMMM yyyy')} onBack={onBack} />

      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }} className="text-sm font-bold text-primary">
          Today
        </button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-7 gap-0">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
          ))}
          {calendarDays.map(day => {
            const dayEvents = myEvents.filter(e => isEventOnDay(e, day));
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`relative flex flex-col items-center py-2 rounded-lg transition-all ${
                  isSelected ? 'bg-primary text-primary-foreground'
                    : isToday(day) ? 'bg-primary/10 text-primary font-bold'
                    : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40'
                }`}
              >
                <span className="text-sm">{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : EVENT_TYPE_CONFIG[e.type].bgColor}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-2 flex flex-wrap gap-2">
        {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${cfg.bgColor}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Selected Day Events */}
      <div className="flex-1 px-4 py-2 space-y-2 border-t border-border overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {format(selectedDate, 'EEEE, d MMMM')}
          </p>
          <button
            onClick={() => { setNewDate(format(selectedDate, 'yyyy-MM-dd')); setShowAddEvent(true); }}
            className="flex items-center gap-1 text-xs font-bold text-primary"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {selectedEvents.length === 0 && !showAddEvent ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No events scheduled</p>
          </div>
        ) : (
          selectedEvents.map(evt => {
            const cfg = EVENT_TYPE_CONFIG[evt.type];
            return (
              <div key={evt.id} className="bg-muted rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.bgColor}`} />
                  <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="font-semibold text-sm">{evt.title}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {evt.isAllDay ? (
                    <span>All day{evt.endDate ? ` — ${format(parseISO(evt.endDate), 'd MMM')}` : ''}</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {evt.time}{evt.endTime ? ` – ${evt.endTime}` : ''}
                    </span>
                  )}
                  {evt.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{evt.location}</span>
                  )}
                </div>
                {evt.notes && <p className="text-xs text-muted-foreground italic">{evt.notes}</p>}
              </div>
            );
          })
        )}

        {/* Add Event Form */}
        {showAddEvent && (
          <div className="bg-muted rounded-xl p-4 space-y-3 border-2 border-primary/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Add Event</p>
              <button onClick={resetAddForm} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Event Type</label>
              <div className="grid grid-cols-2 gap-2">
                {allowedTechTypes.map(t => {
                  const cfg = EVENT_TYPE_CONFIG[t];
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setNewType(t);
                        if (t === 'annual_leave' || t === 'time_in_lieu' || t === 'sick_leave') {
                          setNewIsAllDay(true);
                          setNewTitle(cfg.label);
                        }
                        if (t === 'personal') setNewIsPrivate(true);
                      }}
                      className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                        newType === t ? 'border-primary bg-primary/10' : 'border-border bg-background'
                      }`}
                    >
                      <span className="text-sm">{cfg.emoji} {cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Annual Leave"
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">End Date (optional)</label>
                <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newIsAllDay} onChange={e => setNewIsAllDay(e.target.checked)}
                className="rounded border-border" />
              All day event
            </label>

            {!newIsAllDay && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Time</label>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">End Time</label>
                  <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-sm" />
                </div>
              </div>
            )}

            {newType === 'personal' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newIsPrivate} onChange={e => setNewIsPrivate(e.target.checked)}
                  className="rounded border-border" />
                🔒 Private (admin sees "Busy" only)
              </label>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Notes (optional)</label>
              <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)}
                placeholder="Any extra details..."
                className="w-full p-2.5 border border-border rounded-lg bg-background text-sm h-16 resize-none" />
            </div>

            <button
              onClick={handleAddEvent}
              disabled={!newTitle.trim()}
              className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-40"
            >
              Add Event
            </button>
          </div>
        )}
      </div>

      {/* Google Calendar placeholder */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted/50 rounded-xl p-3 text-center border border-dashed border-border">
          <p className="text-xs text-muted-foreground">🔗 Google Calendar sync — connect later</p>
        </div>
      </div>
    </div>
  );
}
