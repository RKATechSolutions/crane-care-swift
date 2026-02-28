import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { ArrowLeft, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type QuoteFilter = 'not_sent' | 'sent';

interface QuotesPageProps {
  onBack: () => void;
}

// Placeholder data - will be replaced with real data
const mockQuotes = [
  { id: '1', client: 'BHP Steel Works', asset: 'Overhead Crane #3', date: '2026-02-25', sent: false },
  { id: '2', client: 'Rio Tinto Yard', asset: 'Jib Crane #1', date: '2026-02-20', sent: true },
  { id: '3', client: 'Vales Point Power', asset: 'Gantry Crane #2', date: '2026-02-27', sent: false },
];

export default function QuotesPage({ onBack }: QuotesPageProps) {
  const [filter, setFilter] = useState<QuoteFilter>('not_sent');

  const filtered = mockQuotes.filter(q => (filter === 'sent' ? q.sent : !q.sent));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Quotes"
        subtitle="Manage your pending & sent quotes"
        leftAction={
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
        }
      />

      {/* Filter Buttons */}
      <div className="p-4 flex gap-3">
        <Button
          variant={filter === 'not_sent' ? 'default' : 'outline'}
          className="flex-1 gap-2"
          onClick={() => setFilter('not_sent')}
        >
          <Clock className="w-4 h-4" />
          Not Sent
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          className="flex-1 gap-2"
          onClick={() => setFilter('sent')}
        >
          <Send className="w-4 h-4" />
          Sent
        </Button>
      </div>

      {/* Quote List */}
      <div className="flex-1 px-4 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No {filter === 'sent' ? 'sent' : 'pending'} quotes</p>
          </div>
        ) : (
          filtered.map(quote => (
            <div
              key={quote.id}
              className="bg-muted rounded-xl p-4 flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">{quote.client}</p>
                <p className="text-xs text-muted-foreground">{quote.asset}</p>
                <p className="text-xs text-muted-foreground">{quote.date}</p>
              </div>
              <Badge variant={quote.sent ? 'default' : 'secondary'}>
                {quote.sent ? 'Sent' : 'Pending'}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
