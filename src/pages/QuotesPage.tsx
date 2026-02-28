import { useState, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Send, Clock, AlertTriangle, Sparkles, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

type QuoteFilter = 'draft' | 'sent' | 'ai_estimate';

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
  onCreateQuote?: () => void;
}

const ESTIMATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-estimate`;

export default function QuotesPage({ onBack, onCreateQuote }: QuotesPageProps) {
  const [filter, setFilter] = useState<QuoteFilter>('draft');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // AI estimate state
  const [estimateDesc, setEstimateDesc] = useState('');
  const [estimateClient, setEstimateClient] = useState('');
  const [estimateAsset, setEstimateAsset] = useState('');
  const [estimateResult, setEstimateResult] = useState('');
  const [estimating, setEstimating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const filtered = quotes.filter(q => {
    if (filter === 'sent') return q.status === 'sent';
    if (filter === 'draft') return q.status !== 'sent';
    return false;
  });

  const overdueCount = quotes.filter(q => {
    if (q.status === 'sent') return false;
    return (Date.now() - new Date(q.created_at).getTime()) / (1000 * 60 * 60) >= 24;
  }).length;

  const isOverdue = (createdAt: string) =>
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60) >= 24;

  const runEstimate = async () => {
    if (!estimateDesc.trim()) {
      toast.error('Please describe the job');
      return;
    }
    setEstimating(true);
    setEstimateResult('');
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(ESTIMATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          description: estimateDesc,
          client_name: estimateClient,
          asset_name: estimateAsset,
        }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json();
        toast.error(err.error || 'AI estimate failed');
        setEstimating(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setEstimateResult(result);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error('Failed to get AI estimate');
      }
    }
    setEstimating(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Quotes" subtitle="Manage your pending & sent quotes" onBack={onBack} />

      {/* Overdue reminder banner */}
      {overdueCount > 0 && filter === 'draft' && (
        <div className="mx-4 mt-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-amber-800">
            {overdueCount} quote{overdueCount > 1 ? 's' : ''} older than 24 hours
          </p>
        </div>
      )}

      {/* Three Filter Buttons */}
      <div className="p-4 flex gap-2">
        <Button
          variant={filter === 'draft' ? 'default' : 'outline'}
          className="flex-1 gap-1.5 text-xs px-2"
          onClick={() => setFilter('draft')}
        >
          <Clock className="w-3.5 h-3.5" />
          Draft
        </Button>
        <Button
          variant={filter === 'sent' ? 'default' : 'outline'}
          className="flex-1 gap-1.5 text-xs px-2"
          onClick={() => setFilter('sent')}
        >
          <Send className="w-3.5 h-3.5" />
          Sent
        </Button>
        <Button
          variant={filter === 'ai_estimate' ? 'default' : 'outline'}
          className="flex-1 gap-1.5 text-xs px-2"
          onClick={() => setFilter('ai_estimate')}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Estimate
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 space-y-3 overflow-y-auto">
        {filter === 'ai_estimate' ? (
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-foreground">Get a Budget Estimate</p>
              <p className="text-xs text-muted-foreground">Describe the job and the AI will generate a cost estimate breakdown.</p>

              <input
                type="text"
                placeholder="Client name (optional)"
                value={estimateClient}
                onChange={e => setEstimateClient(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Asset / equipment (optional)"
                value={estimateAsset}
                onChange={e => setEstimateAsset(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Describe the job... e.g. Replace worn wire rope on 10T overhead crane, approx 40m run..."
                value={estimateDesc}
                onChange={e => setEstimateDesc(e.target.value)}
                rows={4}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none"
              />
              <Button onClick={runEstimate} disabled={estimating} className="w-full gap-2">
                {estimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {estimating ? 'Estimating...' : 'Generate Estimate'}
              </Button>
            </div>

            {estimateResult && (
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">AI Estimate</p>
                <div className="prose prose-sm max-w-none text-foreground text-sm">
                  <ReactMarkdown>{estimateResult}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading quotes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No {filter === 'sent' ? 'sent' : 'draft'} quotes</p>
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
                  <p className="text-xs text-muted-foreground">{new Date(quote.created_at).toLocaleDateString()}</p>
                  <p className="text-xs font-semibold text-foreground">${Number(quote.total).toFixed(2)}</p>
                </div>
                {quote.quote_number && <p className="text-[10px] text-muted-foreground">#{quote.quote_number}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={quote.status === 'sent' ? 'default' : 'secondary'}>
                  {quote.status === 'sent' ? 'Sent' : 'Draft'}
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
