import { ScheduleEvent } from '@/types/schedule';
import { format, addDays } from 'date-fns';

const today = new Date();
const d = (offset: number) => format(addDays(today, offset), 'yyyy-MM-dd');

export const mockScheduleEvents: ScheduleEvent[] = [
  // Aaron's events
  { id: 'evt-1', technicianId: 'tech-1', technicianName: 'Aaron Harrison', title: 'Periodic Inspection — BHP Steel', date: d(0), time: '08:00', endTime: '12:00', location: 'BHP Steelworks, Port Kembla', type: 'job', siteId: 'site-1' },
  { id: 'evt-2', technicianId: 'tech-1', technicianName: 'Aaron Harrison', title: 'Crane Repair — Orica Mining', date: d(0), time: '13:00', endTime: '16:00', location: 'Orica Mining, Newcastle', type: 'job', siteId: 'site-3' },
  { id: 'evt-3', technicianId: 'tech-1', technicianName: 'Aaron Harrison', title: 'Annual Inspection — Visy Paper', date: d(3), time: '09:00', endTime: '15:00', location: 'Visy Paper Mill, Tumut', type: 'job', siteId: 'site-2' },
  { id: 'evt-4', technicianId: 'tech-1', technicianName: 'Aaron Harrison', title: 'Annual Leave', date: d(7), endDate: d(11), type: 'annual_leave', isAllDay: true },
  { id: 'evt-5', technicianId: 'tech-1', technicianName: 'Aaron Harrison', title: 'Dentist appointment', date: d(14), time: '10:00', endTime: '11:30', type: 'personal', isPrivate: true },

  // Vince's events
  { id: 'evt-6', technicianId: 'tech-2', technicianName: 'Vince Fernandez', title: 'Quarterly Inspection — Bluescope', date: d(0), time: '07:30', endTime: '14:00', location: 'Bluescope Steel, Western Port', type: 'job', siteId: 'site-4' },
  { id: 'evt-7', technicianId: 'tech-2', technicianName: 'Vince Fernandez', title: 'Time in Lieu', date: d(1), type: 'time_in_lieu', isAllDay: true },
  { id: 'evt-8', technicianId: 'tech-2', technicianName: 'Vince Fernandez', title: 'Gantry Crane Service — BHP', date: d(4), time: '08:00', endTime: '16:00', location: 'BHP Steelworks, Port Kembla', type: 'job', siteId: 'site-1' },

  // Ryan's events
  { id: 'evt-9', technicianId: 'tech-3', technicianName: 'Ryan Adams', title: 'Jib Crane Inspection — Visy', date: d(1), time: '09:00', endTime: '12:00', location: 'Visy Paper Mill, Tumut', type: 'job', siteId: 'site-2' },
  { id: 'evt-10', technicianId: 'tech-3', technicianName: 'Ryan Adams', title: 'Sick Leave', date: d(2), type: 'sick_leave', isAllDay: true },
  { id: 'evt-11', technicianId: 'tech-3', technicianName: 'Ryan Adams', title: 'Kids school event', date: d(5), time: '14:00', endTime: '16:00', type: 'personal', isPrivate: true },

  // Seth's events
  { id: 'evt-12', technicianId: 'tech-4', technicianName: 'Seth Adams', title: 'Monorail Service — Orica', date: d(2), time: '08:00', endTime: '13:00', location: 'Orica Mining, Newcastle', type: 'job', siteId: 'site-3' },
  { id: 'evt-13', technicianId: 'tech-4', technicianName: 'Seth Adams', title: 'Annual Leave', date: d(5), endDate: d(6), type: 'annual_leave', isAllDay: true },
];
