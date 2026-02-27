import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Calendar, Users, Package, FileText, LogOut } from 'lucide-react';

export type DashboardView = 'schedule' | 'clients' | 'assets' | 'reports' | null;

interface TechDashboardProps {
  onNavigate: (view: DashboardView) => void;
}

export default function TechDashboard({ onNavigate }: TechDashboardProps) {
  const { state, dispatch } = useApp();

  const cards: { id: DashboardView; icon: React.ReactNode; title: string; desc: string; color: string }[] = [
    {
      id: 'schedule',
      icon: <Calendar className="w-8 h-8" />,
      title: 'Schedule',
      desc: 'View upcoming jobs & appointments',
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
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={`Hi, ${state.currentUser?.name?.split(' ')[0] || 'Technician'}`}
        subtitle="What would you like to do?"
      />

      <div className="flex-1 p-4 space-y-4">
        {/* Quick Stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{state.inspections.filter(i => i.status === 'in_progress').length}</p>
            <p className="text-[10px] text-muted-foreground font-medium">In Progress</p>
          </div>
          <div className="flex-1 bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{state.inspections.filter(i => i.status === 'completed').length}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
          </div>
          <div className="flex-1 bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{state.sites.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Sites</p>
          </div>
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
