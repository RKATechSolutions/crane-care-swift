import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  Timesheet, TimesheetStatus, TimeEntry,
  fetchTimesheets, fetchTimeEntries, updateTimesheetStatus, ENTRY_TYPE_CONFIG,
} from '@/services/timesheetService';
import { Check, X, Clock, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function AdminTimesheetReview() {
  const { state } = useApp();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimesheetStatus | 'all'>('submitted');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<TimeEntry[]>([]);

  const loadTimesheets = async () => {
    setLoading(true);
    try {
      const data = await fetchTimesheets();
      setTimesheets(data);
    } catch {
      toast.error('Failed to load timesheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTimesheets(); }, []);

  const handleAction = async (id: string, status: TimesheetStatus) => {
    try {
      await updateTimesheetStatus(id, status, state.currentUser?.name || 'Admin');
      toast.success(`Timesheet ${status}`);
      loadTimesheets();
    } catch {
      toast.error('Failed to update');
    }
  };

  const toggleExpand = async (ts: Timesheet) => {
    if (expandedId === ts.id) {
      setExpandedId(null);
      return;
    }
    try {
      const entries = await fetchTimeEntries(ts.technician_id, ts.week_start, ts.week_end);
      setExpandedEntries(entries);
      setExpandedId(ts.id);
    } catch {
      toast.error('Failed to load entries');
    }
  };

  const filtered = filter === 'all' ? timesheets : timesheets.filter(t => t.status === filter);

  const statusBadge = (status: TimesheetStatus) => {
    switch (status) {
      case 'draft': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Draft</span>;
      case 'submitted': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳ Submitted</span>;
      case 'approved': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Approved</span>;
      case 'rejected': return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">✗ Rejected</span>;
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {(['submitted', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'submitted' && timesheets.filter(t => t.status === 'submitted').length > 0 && (
              <span className="ml-1 bg-primary-foreground text-primary text-[10px] px-1 rounded-full">
                {timesheets.filter(t => t.status === 'submitted').length}
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
          <p className="text-sm">No {filter === 'all' ? '' : filter} timesheets</p>
        </div>
      ) : (
        filtered.map(ts => (
          <div key={ts.id} className="bg-muted rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpand(ts)}
              className="w-full p-4 text-left flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold">{ts.technician_name}</span>
                  {statusBadge(ts.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Week of {format(parseISO(ts.week_start), 'd MMM')} — {format(parseISO(ts.week_end), 'd MMM yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{Number(ts.total_hours)}h</span>
                {expandedId === ts.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Expanded detail */}
            {expandedId === ts.id && (
              <div className="px-4 pb-4 space-y-2 border-t border-border pt-2">
                {expandedEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No individual entries found</p>
                ) : (
                  expandedEntries.map(entry => {
                    const cfg = ENTRY_TYPE_CONFIG[entry.entry_type];
                    return (
                      <div key={entry.id} className="flex items-center gap-2 bg-background rounded-lg p-2.5">
                        <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{cfg.emoji} {cfg.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parseISO(entry.entry_date), 'EEE d MMM')} • {entry.start_time} – {entry.end_time}
                          </p>
                          {entry.description && <p className="text-[10px] text-muted-foreground truncate">{entry.description}</p>}
                          {entry.client_name && <p className="text-[10px] text-muted-foreground">{entry.client_name}</p>}
                        </div>
                        <span className="text-xs font-bold">{Number(entry.hours)}h</span>
                      </div>
                    );
                  })
                )}

                {ts.status === 'submitted' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAction(ts.id, 'approved')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(ts.id, 'rejected')}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-bold"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}

                {ts.reviewed_by && (
                  <p className="text-[10px] text-muted-foreground">
                    Reviewed by {ts.reviewed_by} • {ts.reviewed_at ? format(parseISO(ts.reviewed_at), 'd MMM, h:mm a') : ''}
                  </p>
                )}

                {!ts.xero_synced && ts.status === 'approved' && (
                  <span className="text-[10px] text-amber-600 font-medium">⚠️ Not synced to Xero</span>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
