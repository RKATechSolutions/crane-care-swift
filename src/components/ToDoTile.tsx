import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ToDoTileProps {
  onClick: () => void;
}

export function ToDoTile({ onClick }: ToDoTileProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [overdueRes, tasksRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'sent')
          .lt('created_at', cutoff),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'completed'),
      ]);
      const overdueCount = overdueRes.count ?? 0;
      const taskCount = tasksRes.count ?? 0;
      setCount(overdueCount + taskCount);
    }
    fetchCount();
  }, []);

  return (
    <button
      onClick={onClick}
      className="bg-muted rounded-2xl p-5 text-left active:scale-[0.97] transition-all flex flex-col gap-3 relative"
    >
      {count > 0 && (
        <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
          {count}
        </span>
      )}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-600">
        <ClipboardList className="w-8 h-8" />
      </div>
      <div>
        <p className="font-bold text-base text-foreground">To-Do</p>
        <p className="text-xs text-muted-foreground leading-snug">Tasks & reminders</p>
      </div>
    </button>
  );
}
