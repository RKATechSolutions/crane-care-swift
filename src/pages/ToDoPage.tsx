import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AlertTriangle, CheckCircle, Plus, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddTaskModal } from '@/components/AddTaskModal';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface ToDoPageProps {
  onBack: () => void;
  onGoToQuotes: () => void;
}

interface OverdueQuote {
  id: string;
  type: 'overdue_quote';
  title: string;
  subtitle: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_id: string;
  assigned_to_name: string;
  created_by_name: string;
  due_date: string | null;
  created_at: string;
}

export default function ToDoPage({ onBack, onGoToQuotes }: ToDoPageProps) {
  const { state } = useApp();
  const [overdueQuotes, setOverdueQuotes] = useState<OverdueQuote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [quotesRes, tasksRes] = await Promise.all([
      supabase
        .from('quotes')
        .select('id, client_name, asset_name, total, created_at')
        .neq('status', 'sent')
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: false }),
    ]);

    if (!quotesRes.error && quotesRes.data) {
      setOverdueQuotes(
        quotesRes.data.map(q => ({
          id: q.id,
          type: 'overdue_quote' as const,
          title: `Send quote to ${q.client_name}`,
          subtitle: `${q.asset_name || 'No asset'} — $${Number(q.total).toFixed(2)}`,
          createdAt: q.created_at,
        }))
      );
    }

    if (!tasksRes.error && tasksRes.data) {
      setTasks(tasksRes.data as Task[]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const completeTask = async (id: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to complete task'); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Task completed');
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete task'); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const hoursAgo = (date: string) => {
    const h = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
    return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  const priorityColor: Record<string, string> = {
    urgent: 'bg-destructive text-destructive-foreground',
    high: 'bg-amber-500/15 text-amber-700',
    normal: 'bg-muted text-muted-foreground',
    low: 'bg-muted text-muted-foreground',
  };

  const totalCount = overdueQuotes.length + tasks.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="To-Do" subtitle={`${totalCount} pending item${totalCount !== 1 ? 's' : ''}`} onBack={onBack} />

      <div className="px-4 py-3">
        <Button onClick={() => setShowAddTask(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      <div className="flex-1 px-4 pb-4 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No pending tasks right now</p>
          </div>
        ) : (
          <>
            {/* Manual Tasks */}
            {tasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tasks ({tasks.length})
                </p>
                {tasks.map(task => (
                  <div key={task.id} className="bg-muted rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <Badge className={`text-[10px] ${priorityColor[task.priority] || ''}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        Assigned to <span className="font-semibold text-foreground">{task.assigned_to_name}</span>
                        {task.assigned_to_id !== task.created_by_name && (
                          <> · by {task.created_by_name}</>
                        )}
                      </span>
                      <span>
                        {task.due_date
                          ? `Due ${new Date(task.due_date).toLocaleDateString()}`
                          : hoursAgo(task.created_at)}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8" onClick={() => completeTask(task.id)}>
                        <Check className="w-3 h-3" /> Done
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overdue Quotes */}
            {overdueQuotes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Overdue Quotes ({overdueQuotes.length})
                </p>
                {overdueQuotes.map(todo => (
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
              </div>
            )}
          </>
        )}
      </div>

      <AddTaskModal open={showAddTask} onClose={() => setShowAddTask(false)} onCreated={fetchAll} />
    </div>
  );
}
