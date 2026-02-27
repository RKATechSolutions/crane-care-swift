export type ScheduleEventType = 'job' | 'annual_leave' | 'time_in_lieu' | 'personal' | 'sick_leave';

export interface ScheduleEvent {
  id: string;
  technicianId: string;
  technicianName: string;
  title: string;
  date: string; // yyyy-MM-dd
  endDate?: string; // for multi-day events
  time?: string; // HH:mm (optional for all-day events)
  endTime?: string;
  location?: string;
  type: ScheduleEventType;
  isAllDay?: boolean;
  isPrivate?: boolean; // personal events — admin sees "Busy" but no details
  notes?: string;
  clientId?: string;
  siteId?: string;
}

export const EVENT_TYPE_CONFIG: Record<ScheduleEventType, { label: string; color: string; bgColor: string; emoji: string }> = {
  job: { label: 'Job', color: 'text-blue-600', bgColor: 'bg-blue-500', emoji: '🔧' },
  annual_leave: { label: 'Annual Leave', color: 'text-emerald-600', bgColor: 'bg-emerald-500', emoji: '🏖️' },
  time_in_lieu: { label: 'Time in Lieu', color: 'text-amber-600', bgColor: 'bg-amber-500', emoji: '⏰' },
  personal: { label: 'Personal', color: 'text-purple-600', bgColor: 'bg-purple-500', emoji: '🔒' },
  sick_leave: { label: 'Sick Leave', color: 'text-red-600', bgColor: 'bg-red-500', emoji: '🤒' },
};
