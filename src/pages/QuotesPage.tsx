import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Send, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type QuoteFilter = 'not_sent' | 'sent';

interface Quote {
  id: string;
  client_name: string;
  asset_name: string | null;
  site_name: string | null;
  total: number;
  status: string;
  created_at: string;
  sent_at: string | null;
  quote_number: string | null;
}

interface QuotesPageProps {
  onBack: () => void;
}

export default function QuotesPage({ onBack }: QuotesPageProps) {
  const [filter, setFilter] = useState<QuoteFilter>('not_sent');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, client_name, asset_name, site_name, total, status, created_at, sent_at, quote_number')
        .order('created_at', { ascending: false });
      if (!error && data) setQuotes(data);
      setLoading(false);
    }
    fetchQuotes();
  }, []);

  const filtered = quotes.filter(q => (filter === 'sent' ? q.status === 'sent' : q.status !== 'sent'));
  const overdueCount = quotes.filter(q => {
    if (q.status === 'sent') return false;
    const hoursOld = (Date.now() - new Date(q.created_at).getTime()) / (1000 * 60 * 60);
    return hoursOld >= 24;
  }).length;

  const isOverdue = (createdAt: string) => {
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return hoursOld >= 24;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Quotes"
        subtitle="Manage your pending & sent quotes"
        onBack={onBack}
      />

      {/* Overdue reminder banner */}
      {overdueCount > 0 && filter === 'not_sent' && (
        <div className="mx-4 mt-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-amber-800">
            {overdueCount} quote{overdueCount > 1 ? 's' : ''} older than 24 hours — please send ASAP
          </p>
        </div>
      )}

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
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading quotes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No {filter === 'sent' ? 'sent' : 'pending'} quotes</p>
          </div>
        ) : (
          filtered.map(quote => (
            <div
              key={quote.id}
              className={`bg-muted rounded-xl p-4 flex items-center justify-between ${
                quote.status !== 'sent' && isOverdue(quote.created_at) ? 'ring-2 ring-amber-500/40' : ''
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{quote.client_name}</p>
                {quote.asset_name && <p className="text-xs text-muted-foreground truncate">{quote.asset_name}</p>}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-semibold text-foreground">${Number(quote.total).toFixed(2)}</p>
                </div>
                {quote.quote_number && (
                  <p className="text-[10px] text-muted-foreground">#{quote.quote_number}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={quote.status === 'sent' ? 'default' : 'secondary'}>
                  {quote.status === 'sent' ? 'Sent' : 'Pending'}
                </Badge>
                {quote.status !== 'sent' && isOverdue(quote.created_at) && (
                  <span className="text-[10px] font-bold text-amber-600">⚠️ Overdue</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
