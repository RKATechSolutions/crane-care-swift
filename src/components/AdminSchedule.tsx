import { useState } from 'react';
import { ScheduleEvent, EVENT_TYPE_CONFIG, ScheduleEventType } from '@/types/schedule';
import { mockScheduleEvents } from '@/data/mockSchedule';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users, Filter } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, parseISO, isWithinInterval, isToday } from 'date-fns';
import { mockUsers } from '@/data/mockData';

export default function AdminSchedule() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTech, setSelectedTech] = useState<string | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const events: ScheduleEvent[] = mockScheduleEvents;
  const technicians = mockUsers.filter(u => u.role === 'technician');
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredTechs = selectedTech === 'all' ? technicians : technicians.filter(t => t.id === selectedTech);

  const isEventOnDay = (event: ScheduleEvent, day: Date) => {
    const eventDate = parseISO(event.date);
    if (event.endDate) {
      const end = parseISO(event.endDate);
      return isWithinInterval(day, { start: eventDate, end }) || isSameDay(day, eventDate) || isSameDay(day, end);
    }
    return isSameDay(day, eventDate);
  };

  const getEventsForTechDay = (techId: string, day: Date) =>
    events.filter(e => e.technicianId === techId && isEventOnDay(e, day));

  const detailEvents = selectedDate
    ? events.filter(e => {
        const matchTech = selectedTech === 'all' || e.technicianId === selectedTech;
        return matchTech && isEventOnDay(e, selectedDate);
      })
    : [];

  return (
    <div className="p-4 space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-bold text-sm">
            {format(weekStart, 'd MMM')} — {format(addDays(weekStart, 6), 'd MMM yyyy')}
          </p>
          <button onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDate(null); }}
            className="text-xs text-primary font-bold">
            This Week
          </button>
        </div>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="p-2 rounded-lg active:bg-muted">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Tech filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <button
          onClick={() => setSelectedTech('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
            selectedTech === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          }`}
        >
          All Techs
        </button>
        {technicians.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTech(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              selectedTech === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {t.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Week Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid gap-1" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
            <div />
            {weekDays.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(isSameDay(day, selectedDate || new Date(0)) ? null : day)}
                className={`text-center py-2 rounded-lg transition-all ${
                  selectedDate && isSameDay(day, selectedDate) ? 'bg-primary text-primary-foreground'
                    : isToday(day) ? 'bg-primary/10 text-primary font-bold'
                    : ''
                }`}
              >
                <p className="text-[10px] font-bold text-muted-foreground">{format(day, 'EEE')}</p>
                <p className="text-sm font-bold">{format(day, 'd')}</p>
              </button>
            ))}
          </div>

          {/* Tech rows */}
          {filteredTechs.map(tech => (
            <div key={tech.id} className="grid gap-1 mt-1" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
              <div className="flex items-center">
                <p className="text-xs font-bold truncate">{tech.name.split(' ')[0]}</p>
              </div>
              {weekDays.map(day => {
                const dayEvents = getEventsForTechDay(tech.id, day);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[48px] rounded-lg p-1 cursor-pointer transition-colors ${
                      dayEvents.length > 0 ? 'bg-muted' : 'bg-muted/30'
                    } ${isToday(day) ? 'ring-1 ring-primary/30' : ''}`}
                  >
                    {dayEvents.map(evt => {
                      const cfg = EVENT_TYPE_CONFIG[evt.type];
                      const displayTitle = evt.isPrivate ? 'Busy' : evt.title;
                      return (
                        <div key={evt.id} className={`${cfg.bgColor} text-white rounded px-1 py-0.5 mb-0.5 truncate`}>
                          <p className="text-[9px] font-bold truncate">{displayTitle}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${cfg.bgColor}`} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedDate && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {format(selectedDate, 'EEEE, d MMMM')}
          </p>
          {detailEvents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No events</p>
            </div>
          ) : (
            detailEvents.map(evt => {
              const cfg = EVENT_TYPE_CONFIG[evt.type];
              const isPrivateView = evt.isPrivate;
              return (
                <div key={evt.id} className="bg-muted rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.bgColor}`} />
                    <span className="text-xs font-medium text-muted-foreground">{evt.technicianName}</span>
                    <span className="text-xs text-muted-foreground">• {cfg.label}</span>
                  </div>
                  <p className="font-semibold text-sm">{isPrivateView ? '🔒 Busy (Private)' : evt.title}</p>
                  {!isPrivateView && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {evt.isAllDay ? (
                        <span>All day{evt.endDate ? ` — ${format(parseISO(evt.endDate), 'd MMM')}` : ''}</span>
                      ) : (
                        evt.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{evt.time}{evt.endTime ? ` – ${evt.endTime}` : ''}</span>
                      )}
                      {evt.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{evt.location}</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Google Calendar placeholder */}
      <div className="bg-muted/50 rounded-xl p-3 text-center border border-dashed border-border">
        <p className="text-xs text-muted-foreground">🔗 Google Calendar sync — connect later</p>
      </div>
    </div>
  );
}
