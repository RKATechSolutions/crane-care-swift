import { useState, useEffect } from 'react';
import { LeaveRequest, LeaveStatus, LEAVE_TYPE_CONFIG, fetchLeaveRequests, updateLeaveStatus } from '@/services/leaveService';
import { useApp } from '@/contexts/AppContext';
import { Check, X, Clock, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function AdminLeaveApproval() {
  const { state } = useApp();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeaveStatus | 'all'>('pending');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaveRequests();
      setRequests(data);
    } catch {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleAction = async (id: string, status: LeaveStatus) => {
    try {
      await updateLeaveStatus(id, status, state.currentUser?.name || 'Admin');
      toast.success(`Leave request ${status}`);
      loadRequests();
    } catch {
      toast.error('Failed to update request');
    }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const statusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'pending': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ Pending</span>;
      case 'approved': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Approved</span>;
      case 'rejected': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">✗ Rejected</span>;
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-1 bg-primary-foreground text-primary text-[10px] px-1 rounded-full">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No {filter === 'all' ? '' : filter} leave requests</p>
        </div>
      ) : (
        filtered.map(req => {
          const cfg = LEAVE_TYPE_CONFIG[req.leave_type];
          return (
            <div key={req.id} className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                  <span className="text-xs font-bold">{req.technician_name}</span>
                </div>
                {statusBadge(req.status)}
              </div>

              <p className="font-semibold text-sm">{cfg.emoji} {cfg.label}</p>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>📅 {format(parseISO(req.start_date), 'd MMM yyyy')}
                  {req.start_date !== req.end_date && ` — ${format(parseISO(req.end_date), 'd MMM yyyy')}`}
                </p>
                {!req.is_all_day && req.start_time && (
                  <p>🕐 {req.start_time}{req.end_time ? ` – ${req.end_time}` : ''}</p>
                )}
                {req.reason && <p className="italic">"{req.reason}"</p>}
              </div>

              {req.status === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAction(req.id, 'approved')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'rejected')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}

              {req.reviewed_by && (
                <p className="text-[10px] text-muted-foreground">
                  Reviewed by {req.reviewed_by} • {req.reviewed_at ? format(parseISO(req.reviewed_at), 'd MMM, h:mm a') : ''}
                </p>
              )}

              {!req.xero_synced && req.status === 'approved' && (
                <span className="text-[10px] text-amber-600 font-medium">⚠️ Not synced to Xero</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
