import { supabase } from '@/integrations/supabase/client';

export type TimeEntryType = 'inspection' | 'travel' | 'repair' | 'admin' | 'training' | 'other';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface TimeEntry {
  id: string;
  technician_id: string;
  technician_name: string;
  entry_date: string;
  entry_type: TimeEntryType;
  start_time?: string | null;
  end_time?: string | null;
  hours: number;
  description?: string | null;
  client_name?: string | null;
  site_id?: string | null;
  inspection_id?: string | null;
  is_auto_logged: boolean;
  xero_synced: boolean;
  created_at: string;
}

export interface Timesheet {
  id: string;
  technician_id: string;
  technician_name: string;
  week_start: string;
  week_end: string;
  total_hours: number;
  status: TimesheetStatus;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  xero_synced: boolean;
  created_at: string;
}

export const ENTRY_TYPE_CONFIG: Record<TimeEntryType, { label: string; emoji: string; color: string }> = {
  inspection: { label: 'Inspection', emoji: '🔍', color: 'bg-blue-500' },
  travel: { label: 'Travel', emoji: '🚗', color: 'bg-cyan-500' },
  repair: { label: 'Repair', emoji: '🔧', color: 'bg-amber-500' },
  admin: { label: 'Admin', emoji: '📋', color: 'bg-slate-500' },
  training: { label: 'Training', emoji: '📚', color: 'bg-purple-500' },
  other: { label: 'Other', emoji: '📌', color: 'bg-muted-foreground' },
};

export async function fetchTimeEntries(technicianId: string, weekStart?: string, weekEnd?: string): Promise<TimeEntry[]> {
  let query = supabase.from('time_entries').select('*')
    .eq('technician_id', technicianId)
    .order('entry_date', { ascending: false })
    .order('start_time', { ascending: true });
  if (weekStart) query = query.gte('entry_date', weekStart);
  if (weekEnd) query = query.lte('entry_date', weekEnd);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as TimeEntry[];
}

export async function createTimeEntry(entry: Omit<TimeEntry, 'id' | 'xero_synced' | 'created_at'>): Promise<TimeEntry> {
  const { data, error } = await supabase.from('time_entries').insert(entry as any).select().single();
  if (error) throw error;
  return data as unknown as TimeEntry;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchTimesheets(technicianId?: string): Promise<Timesheet[]> {
  let query = supabase.from('timesheets').select('*').order('week_start', { ascending: false });
  if (technicianId) query = query.eq('technician_id', technicianId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Timesheet[];
}

export async function submitTimesheet(techId: string, techName: string, weekStart: string, weekEnd: string, totalHours: number): Promise<void> {
  const { error } = await supabase.from('timesheets').upsert({
    technician_id: techId,
    technician_name: techName,
    week_start: weekStart,
    week_end: weekEnd,
    total_hours: totalHours,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any, { onConflict: 'technician_id,week_start' });
  if (error) throw error;
}

export async function updateTimesheetStatus(id: string, status: TimesheetStatus, reviewedBy: string, notes?: string): Promise<void> {
  const { error } = await supabase.from('timesheets').update({
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_notes: notes || null,
    updated_at: new Date().toISOString(),
  } as any).eq('id', id);
  if (error) throw error;
}

// Calculate hours from start/end time strings
export function calculateHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, Math.round((diff / 60) * 100) / 100);
}
