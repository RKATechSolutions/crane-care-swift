import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import FormBuilder from '@/components/FormBuilder';
import AdminCustomisation from '@/components/AdminCustomisation';
import AdminSchedule from '@/components/AdminSchedule';
import AdminLeaveApproval from '@/components/AdminLeaveApproval';
import { Lightbulb, Check, X, FileText, Mail, LogOut, Wrench, Settings, Calendar, Palmtree } from 'lucide-react';
import { SuggestedQuestion, SentReport } from '@/types/inspection';
import { useState } from 'react';

export default function AdminDashboard() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'suggestions' | 'forms' | 'customise' | 'reports' | 'schedule' | 'leave'>('schedule');

  // Gather all suggestions across all inspections
  const allSuggestions: (SuggestedQuestion & { inspectionId: string })[] = [];
  state.inspections.forEach(insp => {
    (insp.suggestedQuestions || []).forEach(sq => {
      allSuggestions.push({
        ...sq,
        inspectionId: insp.id,
        craneName: sq.craneName || state.sites.flatMap(s => s.cranes).find(c => c.id === insp.craneId)?.name || 'Unknown',
        siteName: sq.siteName || state.sites.find(s => s.id === insp.siteId)?.name || 'Unknown',
      });
    });
  });

  const pendingSuggestions = allSuggestions.filter(s => s.status === 'pending');
  const reviewedSuggestions = allSuggestions.filter(s => s.status !== 'pending');

  // Sent reports from state
  const sentReports: SentReport[] = state.sentReports || [];

  const handleApprove = (suggestion: typeof allSuggestions[0]) => {
    dispatch({
      type: 'UPDATE_SUGGESTION_STATUS',
      payload: { inspectionId: suggestion.inspectionId, suggestionId: suggestion.id, status: 'approved' },
    });
  };

  const handleReject = (suggestion: typeof allSuggestions[0]) => {
    dispatch({
      type: 'UPDATE_SUGGESTION_STATUS',
      payload: { inspectionId: suggestion.inspectionId, suggestionId: suggestion.id, status: 'rejected' },
    });
  };

  const typeIcon = (type: SentReport['type']) => {
    if (type === 'email') return <Mail className="w-4 h-4 text-primary" />;
    return <FileText className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Admin Dashboard"
        subtitle={`${pendingSuggestions.length} pending suggestions`}
        onBack={() => dispatch({ type: 'LOGOUT' })}
      />

      <div className="flex border-b border-border bg-background sticky top-[56px] z-20 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTab('schedule')}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors whitespace-nowrap px-2 ${
            tab === 'schedule' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-1" />
          Schedule
        </button>
        <button
          onClick={() => setTab('suggestions')}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors whitespace-nowrap px-2 ${
            tab === 'suggestions' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Lightbulb className="w-4 h-4 inline mr-1" />
          Suggestions {pendingSuggestions.length > 0 && (
            <span className="ml-1 bg-rka-orange text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full font-bold">
              {pendingSuggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('forms')}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors whitespace-nowrap px-2 ${
            tab === 'forms' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Wrench className="w-4 h-4 inline mr-1" />
          Forms
        </button>
        <button
          onClick={() => setTab('customise')}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors whitespace-nowrap px-2 ${
            tab === 'customise' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-1" />
          Customise
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors whitespace-nowrap px-2 ${
            tab === 'reports' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          Reports
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'schedule' && <AdminSchedule />}

        {tab === 'suggestions' && (
          <div className="p-4 space-y-3">
            {pendingSuggestions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No pending suggestions</p>
                <p className="text-sm">Technician suggestions will appear here for review</p>
              </div>
            )}

            {pendingSuggestions.length > 0 && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending Approval</p>
            )}

            {pendingSuggestions.map(s => (
              <div key={s.id} className="bg-muted rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{s.siteName} • {s.craneName}</p>
                    <p className="font-semibold text-sm mt-1">Q: {s.question}</p>
                    {s.answer && <p className="text-sm text-muted-foreground mt-0.5">A: {s.answer}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    By {s.suggestedBy} • {new Date(s.timestamp).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(s)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rka-green text-primary-foreground rounded-lg text-xs font-bold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(s)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rka-red text-destructive-foreground rounded-lg text-xs font-bold"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {reviewedSuggestions.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6">Previously Reviewed</p>
                {reviewedSuggestions.map(s => (
                  <div key={s.id} className="bg-muted/50 rounded-xl p-3 opacity-70">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'approved' ? 'bg-rka-green/20 text-rka-green-dark' : 'bg-rka-red/20 text-rka-red'
                      }`}>
                        {s.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.siteName}</span>
                    </div>
                    <p className="text-sm font-medium mt-1">Q: {s.question}</p>
                    {s.answer && <p className="text-xs text-muted-foreground">A: {s.answer}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'forms' && <FormBuilder />}

        {tab === 'customise' && <AdminCustomisation />}

        {tab === 'reports' && (
          <div className="p-4 space-y-3">
            {sentReports.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No reports sent yet</p>
                <p className="text-sm">PDFs and communications sent to customers will appear here</p>
              </div>
            )}

            {sentReports.map(r => (
              <div key={r.id} className="flex items-center gap-3 bg-muted rounded-xl p-3">
                {typeIcon(r.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.recipientName && `To: ${r.recipientName}`}
                    {r.recipientEmail && ` (${r.recipientEmail})`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground">{new Date(r.sentAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-muted-foreground">{r.sentBy}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => dispatch({ type: 'LOGOUT' })}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
