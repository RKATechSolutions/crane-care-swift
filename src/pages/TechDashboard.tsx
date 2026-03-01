import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { FiveStarGoalBanner } from '@/components/FiveStarGoalBanner';
import { Calendar, Users, Package, FileText, LogOut, Clock, FileCheck, Receipt, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export type DashboardView = 'schedule' | 'clients' | 'assets' | 'reports' | 'timesheet' | 'quotes' | 'todo' | 'receipts' | 'tasks' | 'job-detail' | null;

interface TechDashboardProps {
  onNavigate: (view: DashboardView) => void;
}

export default function TechDashboard({ onNavigate }: TechDashboardProps) {
  const { state, dispatch } = useApp();
  const [todoCount, setTodoCount] = useState(0);
  const [jobsThisWeek, setJobsThisWeek] = useState(0);
  const [jobsCompleted, setJobsCompleted] = useState(0);

  useEffect(() => {
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      // To-do count: overdue quotes + pending tasks
      supabase.from('quotes').select('*', { count: 'exact', head: true }).neq('status', 'sent').lt('created_at', cutoff),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
      // Jobs scheduled this week (not completed)
      supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'completed').gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd),
      // Jobs completed this week
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', `${weekStart}T00:00:00`).lte('completed_at', `${weekEnd}T23:59:59`),
    ]).then(([overdueRes, tasksRes, scheduledRes, completedRes]) => {
      setTodoCount((overdueRes.count ?? 0) + (tasksRes.count ?? 0));
      setJobsThisWeek(scheduledRes.count ?? 0);
      setJobsCompleted(completedRes.count ?? 0);
    });
  }, []);

  const cards: { id: DashboardView; icon: React.ReactNode; title: string; desc: string; color: string }[] = [
    {
      id: 'schedule',
      icon: <Calendar className="w-8 h-8" />,
      title: 'Schedule & Leave',
      desc: 'View jobs, calendar & request leave',
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      id: 'clients',
      icon: <Users className="w-8 h-8" />,
      title: 'Clients',
      desc: 'Browse sites & start inspections',
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      id: 'assets',
      icon: <Package className="w-8 h-8" />,
      title: 'Assets',
      desc: 'Search & manage equipment',
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      id: 'reports',
      icon: <FileText className="w-8 h-8" />,
      title: 'Reports',
      desc: 'View sent reports & PDFs',
      color: 'bg-purple-500/10 text-purple-600',
    },
    {
      id: 'timesheet',
      icon: <Clock className="w-8 h-8" />,
      title: 'Timesheet',
      desc: 'Log hours & submit for approval',
      color: 'bg-rose-500/10 text-rose-600',
    },
    {
      id: 'quotes',
      icon: <FileCheck className="w-8 h-8" />,
      title: 'Quotes',
      desc: 'View & send pending quotes',
      color: 'bg-cyan-500/10 text-cyan-600',
    },
    {
      id: 'receipts',
      icon: <Receipt className="w-8 h-8" />,
      title: 'Receipts',
      desc: 'Send receipts straight to Xero',
      color: 'bg-teal-500/10 text-teal-600',
    },
    {
      id: 'tasks',
      icon: <Wrench className="w-8 h-8" />,
      title: 'Jobs',
      desc: 'Create & manage jobs',
      color: 'bg-indigo-500/10 text-indigo-600',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={`Hi, ${state.currentUser?.name?.split(' ')[0] || 'Technician'}`}
        subtitle="What would you like to do?"
      />

      <div className="flex-1 p-4 space-y-4">
        <FiveStarGoalBanner />

        {/* Quick Stats */}
        <div className="flex gap-3">
          <button onClick={() => onNavigate('todo')} className="flex-1 bg-muted rounded-xl p-3 text-center active:scale-[0.97] transition-all">
            <p className="text-2xl font-bold text-foreground">{todoCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">To-Do</p>
          </button>
          <button onClick={() => onNavigate('tasks')} className="flex-1 bg-muted rounded-xl p-3 text-center active:scale-[0.97] transition-all">
            <p className="text-2xl font-bold text-foreground">{jobsThisWeek}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Jobs This Week</p>
          </button>
          <button onClick={() => onNavigate('tasks')} className="flex-1 bg-muted rounded-xl p-3 text-center active:scale-[0.97] transition-all">
            <p className="text-2xl font-bold text-foreground">{jobsCompleted}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
          </button>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="bg-muted rounded-2xl p-5 text-left active:scale-[0.97] transition-all flex flex-col gap-3"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="font-bold text-base text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => dispatch({ type: 'LOGOUT' })}
          className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
