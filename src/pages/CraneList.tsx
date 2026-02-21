import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { useState } from 'react';
import { ChevronRight, PlayCircle, Info } from 'lucide-react';
import { Crane, InspectionItemResult } from '@/types/inspection';
import { mockTemplate } from '@/data/mockData';

export default function CraneList() {
  const { state, dispatch } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const site = state.selectedSite!;

  const startInspection = (crane: Crane) => {
    dispatch({ type: 'SELECT_CRANE', payload: crane });

    const template = state.templates.find(
      t => t.craneType === crane.type && t.isActive
    );
    if (!template) return;

    // Check for existing draft
    const existing = state.inspections.find(
      i => i.craneId === crane.id && i.status !== 'completed'
    );
    if (existing) {
      dispatch({ type: 'START_INSPECTION', payload: existing });
      return;
    }

    const items: InspectionItemResult[] = template.sections.flatMap(section =>
      section.items.map(item => ({
        templateItemId: item.id,
        sectionId: section.id,
      }))
    );

    dispatch({
      type: 'START_INSPECTION',
      payload: {
        id: `insp-${Date.now()}`,
        siteId: site.id,
        craneId: crane.id,
        templateId: template.id,
        templateVersion: template.version,
        technicianId: state.currentUser!.id,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        items,
      },
    });
  };

  const getInspectionStatus = (craneId: string) => {
    return state.inspections.find(i => i.craneId === craneId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={site.name}
        subtitle={`${site.cranes.length} cranes`}
        onBack={() => dispatch({ type: 'BACK_TO_SITES' })}
        onNoteToAdmin={() => setNoteOpen(true)}
      />

      <div className="flex-1">
        {site.cranes.map(crane => {
          const canInspect = crane.type === 'Single Girder Overhead';
          const existing = getInspectionStatus(crane.id);

          return (
            <div key={crane.id} className="border-b border-border">
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base">{crane.name}</p>
                    <p className="text-sm text-muted-foreground">{crane.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {crane.capacity} • {crane.manufacturer} • SN: {crane.serialNumber}
                    </p>
                  </div>
                  {existing?.status === 'completed' && (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      existing.craneStatus === 'Safe to Operate' ? 'bg-rka-green-light text-rka-green-dark' :
                      existing.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                      'bg-rka-orange-light text-rka-orange'
                    }`}>
                      {existing.craneStatus}
                    </span>
                  )}
                </div>

                {canInspect ? (
                  <button
                    onClick={() => startInspection(crane)}
                    className={`mt-3 w-full tap-target rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      existing?.status === 'completed'
                        ? 'bg-muted text-foreground'
                        : existing?.status === 'in_progress'
                        ? 'bg-rka-orange text-destructive-foreground'
                        : 'bg-primary text-primary-foreground shadow-lg'
                    }`}
                  >
                    <PlayCircle className="w-5 h-5" />
                    {existing?.status === 'completed' ? 'View / Re-open' : existing?.status === 'in_progress' ? 'Continue Inspection' : 'Start Inspection'}
                  </button>
                ) : (
                  <div className="mt-3 tap-target rounded-xl bg-muted flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Info className="w-4 h-4" />
                    Inspection form not available yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Site Job Summary button - show when at least one crane completed */}
      {state.inspections.some(i => i.siteId === site.id && i.status === 'completed') && (
        <div className="p-4 border-t border-border">
          <button
            onClick={() => {
              // Navigate to site job summary - we'll use selectedCrane = null as signal
              dispatch({ type: 'SELECT_CRANE', payload: { id: '__site_summary__' } as any });
            }}
            className="w-full tap-target bg-foreground text-background rounded-xl font-bold text-base"
          >
            Complete Site Job Summary
          </button>
        </div>
      )}

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />
    </div>
  );
}
