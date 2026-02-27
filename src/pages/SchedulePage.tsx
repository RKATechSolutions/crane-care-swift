import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // ISO date
  time: string;
  location: string;
  type: 'inspection' | 'repair' | 'meeting' | 'other';
}

interface SchedulePageProps {
  onBack: () => void;
}

export default function SchedulePage({ onBack }: SchedulePageProps) {
  const { state } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate mock events from completed inspections + future dates
  const events: ScheduleEvent[] = [
    {
      id: 'evt-1',
      title: 'Periodic Inspection — BHP Steel',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '08:00',
      location: 'BHP Steel Works, Newcastle',
      type: 'inspection',
    },
    {
      id: 'evt-2',
      title: 'Crane Repair — Orica Mining',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '13:00',
      location: 'Orica Mining, Hunter Valley',
      type: 'repair',
    },
    {
      id: 'evt-3',
      title: 'Annual Inspection — Vales Point',
      date: format(addMonths(new Date(), 0), 'yyyy-MM-dd').replace(/\d{2}$/, '15'),
      time: '09:00',
      location: 'Vales Point Power Station',
      type: 'inspection',
    },
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const selectedEvents = events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));

  const typeColor = (type: ScheduleEvent['type']) => {
    switch (type) {
      case 'inspection': return 'bg-blue-500';
      case 'repair': return 'bg-amber-500';
      case 'meeting': return 'bg-purple-500';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Schedule"
        subtitle={format(currentMonth, 'MMMM yyyy')}
        onBack={onBack}
      />

      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
          className="text-sm font-bold text-primary"
        >
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
            const dayEvents = events.filter(e => e.date === format(day, 'yyyy-MM-dd'));
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`relative flex flex-col items-center py-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday(day)
                    ? 'bg-primary/10 text-primary font-bold'
                    : isCurrentMonth
                    ? 'text-foreground'
                    : 'text-muted-foreground/40'
                }`}
              >
                <span className="text-sm">{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : typeColor(e.type)}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      <div className="flex-1 px-4 py-2 space-y-2 border-t border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          {format(selectedDate, 'EEEE, d MMMM')}
        </p>

        {selectedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No jobs scheduled</p>
          </div>
        ) : (
          selectedEvents.map(evt => (
            <div key={evt.id} className="bg-muted rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${typeColor(evt.type)}`} />
                <p className="font-semibold text-sm flex-1">{evt.title}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{evt.time}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{evt.location}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Google Calendar connection placeholder */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted/50 rounded-xl p-3 text-center border border-dashed border-border">
          <p className="text-xs text-muted-foreground">Google Calendar sync coming soon</p>
        </div>
      </div>
    </div>
  );
}
