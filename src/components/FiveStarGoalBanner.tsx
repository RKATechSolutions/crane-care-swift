import { useEffect, useState } from 'react';
import { Star, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const GOAL = 100;

export function FiveStarGoalBanner() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCount() {
      const { count: total, error } = await supabase
        .from('star_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('rating', 5);
      if (!error && total !== null) setCount(total);
      setLoading(false);
    }
    fetchCount();
  }, []);

  const pct = Math.min((count / GOAL) * 100, 100);
  const reached = count >= GOAL;

  return (
    <div className={`mx-4 mt-4 rounded-2xl p-4 ${reached ? 'bg-amber-500/15' : 'bg-amber-500/10'} border border-amber-500/20`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          {reached ? <Trophy className="w-5 h-5 text-amber-600" /> : <Star className="w-5 h-5 text-amber-600" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">
            {reached ? '🎉 Goal Reached!' : '⭐ 5-Star Sign-offs'}
          </p>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading...' : `${count} of ${GOAL} goal`}
          </p>
        </div>
        <span className="text-2xl font-black text-amber-600">{loading ? '—' : count}</span>
      </div>
      <div className="h-2.5 bg-amber-500/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
