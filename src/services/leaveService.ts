import { supabase } from '@/integrations/supabase/client';

export type LeaveType = 'annual_leave' | 'time_in_lieu' | 'sick_leave' | 'personal';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  technician_id: string;
  technician_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  is_all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  status: LeaveStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  xero_synced: boolean;
  created_at: string;
  updated_at: string;
}

export const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; emoji: string; color: string }> = {
  annual_leave: { label: 'Annual Leave', emoji: '🏖️', color: 'bg-emerald-500' },
  time_in_lieu: { label: 'Time in Lieu', emoji: '⏰', color: 'bg-amber-500' },
  sick_leave: { label: 'Sick Leave', emoji: '🤒', color: 'bg-red-500' },
  personal: { label: 'Personal', emoji: '🔒', color: 'bg-purple-500' },
};

export async function fetchLeaveRequests(technicianId?: string): Promise<LeaveRequest[]> {
  let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
  if (technicianId) {
    query = query.eq('technician_id', technicianId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as LeaveRequest[];
}

export async function createLeaveRequest(req: Omit<LeaveRequest, 'id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'review_notes' | 'xero_synced' | 'created_at' | 'updated_at'>): Promise<LeaveRequest> {
  const { data, error } = await supabase.from('leave_requests').insert(req as any).select().single();
  if (error) throw error;
  return data as unknown as LeaveRequest;
}

export async function updateLeaveStatus(id: string, status: LeaveStatus, reviewedBy: string, reviewNotes?: string): Promise<void> {
  const { error } = await supabase.from('leave_requests').update({
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes || null,
    updated_at: new Date().toISOString(),
  } as any).eq('id', id);
  if (error) throw error;
}
