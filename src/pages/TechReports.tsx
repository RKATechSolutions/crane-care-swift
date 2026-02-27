import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { FileText, Mail } from 'lucide-react';

interface TechReportsProps {
  onBack: () => void;
}

export default function TechReports({ onBack }: TechReportsProps) {
  const { state } = useApp();
  const sentReports = state.sentReports || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Reports"
        subtitle={`${sentReports.length} sent`}
        onBack={onBack}
      />

      <div className="flex-1 p-4 space-y-3">
        {sentReports.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No reports sent yet</p>
            <p className="text-sm">Completed inspection reports will appear here</p>
          </div>
        ) : (
          sentReports.map(r => (
            <div key={r.id} className="flex items-center gap-3 bg-muted rounded-xl p-3">
              {r.type === 'email'
                ? <Mail className="w-4 h-4 text-primary" />
                : <FileText className="w-4 h-4 text-primary" />
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
