import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Plus, Check, Trash2, Calendar, User, Wrench, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreateJobTaskModal } from '@/components/CreateJobTaskModal';

interface TasksPageProps {
  onBack: () => void;
  onOpenJob?: (jobId: string) => void;
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
  scheduled_date: string | null;
  client_name: string | null;
  job_type: string | null;
  created_at: string;
  completed_at: string | null;
}

const JOB_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  crane_inspection: { label: 'Crane Inspection', color: 'bg-blue-500/15 text-blue-700' },
  lifting_inspection: { label: 'Lifting Inspection', color: 'bg-cyan-500/15 text-cyan-700' },
  crane_lifting_inspection: { label: 'Crane & Lifting', color: 'bg-indigo-500/15 text-indigo-700' },
  installation: { label: 'Installation', color: 'bg-purple-500/15 text-purple-700' },
  breakdown: { label: 'Breakdown', color: 'bg-red-500/15 text-red-700' },
  repair: { label: 'Repair', color: 'bg-amber-500/15 text-amber-700' },
  general: { label: 'General', color: 'bg-muted text-muted-foreground' },
};

export default function TasksPage({ onBack, onOpenJob }: TasksPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'finished'>('open');
  const [showCreate, setShowCreate] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setTasks(data as Task[]);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const openTasks = tasks.filter(t => t.status !== 'completed');
  const finishedTasks = tasks.filter(t => t.status === 'completed');
  const displayed = tab === 'open' ? openTasks : finishedTasks;

  const completeTask = async (id: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to complete task'); return; }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t));
    toast.success('Task completed');
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const reopenTask = async (id: string) => {
    const { error } = await supabase.from('tasks').update({ status: 'pending', completed_at: null }).eq('id', id);
    if (error) { toast.error('Failed to reopen'); return; }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending', completed_at: null } : t));
    toast.success('Task reopened');
  };

  const priorityColor: Record<string, string> = {
    urgent: 'bg-destructive text-destructive-foreground',
    high: 'bg-amber-500/15 text-amber-700',
    normal: 'bg-muted text-muted-foreground',
    low: 'bg-muted text-muted-foreground',
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Jobs" subtitle={`${openTasks.length} open · ${finishedTasks.length} finished`} onBack={onBack} />

      {/* Create button */}
      <div className="px-4 py-3">
        <Button onClick={() => setShowCreate(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Create Job
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2">
        <button
          onClick={() => setTab('open')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'open' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Open ({openTasks.length})
        </button>
        <button
          onClick={() => setTab('finished')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === 'finished' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          Finished ({finishedTasks.length})
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{tab === 'open' ? 'No open jobs' : 'No finished jobs yet'}</p>
          </div>
        ) : (
          displayed.map(task => {
            const jobCfg = JOB_TYPE_CONFIG[task.job_type || 'general'] || JOB_TYPE_CONFIG.general;
            return (
              <div key={task.id} className={`bg-muted rounded-xl p-4 space-y-2 ${task.status === 'completed' ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Badge className={`text-[10px] ${jobCfg.color}`}>{jobCfg.label}</Badge>
                    <Badge className={`text-[10px] ${priorityColor[task.priority] || ''}`}>{task.priority}</Badge>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  {task.client_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {task.client_name}
                    </span>
                  )}
                  {task.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(task.scheduled_date)}
                    </span>
                  )}
                  <span>
                    Assigned to <span className="font-semibold text-foreground">{task.assigned_to_name}</span>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {tab === 'open' ? (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8" onClick={() => completeTask(task.id)}>
                        <Check className="w-3 h-3" /> Done
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs h-8" onClick={() => reopenTask(task.id)}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateJobTaskModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchTasks} />
    </div>
  );
}
