import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { FileText, Mail, Download, ClipboardCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface TechReportsProps {
  onBack: () => void;
}

export default function TechReports({ onBack }: TechReportsProps) {
  const { state } = useApp();
  const sentReports = state.sentReports || [];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sentReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sentReports.map(r => r.id)));
    }
  };

  const handleCompleteJobSummary = () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one report');
      return;
    }
    const selected = sentReports.filter(r => selectedIds.has(r.id));
    toast.success(`Job Site Summary started with ${selected.length} report(s)`);
    // TODO: Navigate to Job Site Summary with selected report IDs
  };

  const handleDownloadSelected = () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one report');
      return;
    }
    toast.success(`Downloading ${selectedIds.size} report(s)…`);
    // TODO: Trigger individual PDF downloads for each selected report
  };

  const hasReports = sentReports.length > 0;
  const allSelected = hasReports && selectedIds.size === sentReports.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Reports"
        subtitle={`${sentReports.length} sent`}
        onBack={onBack}
      />

      <div className="flex-1 p-4 space-y-3">
        {!hasReports ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No reports sent yet</p>
            <p className="text-sm">Completed inspection reports will appear here</p>
          </div>
        ) : (
          <>
            {/* Select all */}
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              <Checkbox checked={allSelected} />
              <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
            </button>

            {sentReports.map(r => (
              <button
                key={r.id}
                onClick={() => toggleSelect(r.id)}
                className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                  selectedIds.has(r.id)
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'bg-muted'
                }`}
              >
                <Checkbox checked={selectedIds.has(r.id)} />
                {r.type === 'email'
                  ? <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  : <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                }
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
              </button>
            ))}

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <Button
                className="w-full gap-2"
                onClick={handleCompleteJobSummary}
                disabled={selectedIds.size === 0}
              >
                <ClipboardCheck className="w-4 h-4" />
                Complete Job Site Summary with these reports
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadSelected}
                disabled={selectedIds.size === 0}
              >
                <Download className="w-4 h-4" />
                Download Selected
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
