import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { ClipboardList, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ToDoPageProps {
  onBack: () => void;
  onGoToQuotes: () => void;
}

interface TodoItem {
  id: string;
  type: 'overdue_quote';
  title: string;
  subtitle: string;
  createdAt: string;
}

export default function ToDoPage({ onBack, onGoToQuotes }: ToDoPageProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodos() {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('quotes')
        .select('id, client_name, asset_name, total, created_at')
        .neq('status', 'sent')
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setTodos(
          data.map(q => ({
            id: q.id,
            type: 'overdue_quote' as const,
            title: `Send quote to ${q.client_name}`,
            subtitle: `${q.asset_name || 'No asset'} — $${Number(q.total).toFixed(2)}`,
            createdAt: q.created_at,
          }))
        );
      }
      setLoading(false);
    }
    fetchTodos();
  }, []);

  const hoursAgo = (date: string) => {
    const h = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
    return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="To-Do" subtitle="Pending tasks & reminders" onBack={onBack} />

      <div className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : todos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No pending tasks right now</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Overdue Quotes ({todos.length})
            </p>
            {todos.map(todo => (
              <button
                key={todo.id}
                onClick={onGoToQuotes}
                className="w-full bg-muted rounded-xl p-4 flex items-start gap-3 text-left active:scale-[0.98] transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{todo.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{todo.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{hoursAgo(todo.createdAt)}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
