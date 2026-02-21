import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { ChecklistItem } from '@/components/ChecklistItem';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { CraneOperationalStatus, InspectionItemResult } from '@/types/inspection';
import { Save, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';

export default function InspectionForm() {
  const { state, dispatch } = useApp();
  const [noteOpen, setNoteOpen] = useState(false);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const inspection = state.currentInspection!;

  // Scroll to top when section changes
  const handleSectionChange = useCallback((idx: number) => {
    setCurrentSectionIdx(idx);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const template = state.templates.find(t => t.id === inspection.templateId)!;
  const crane = state.selectedSite!.cranes.find(c => c.id === inspection.craneId)!;

  const sections = template.sections;
  const currentSection = sections[currentSectionIdx];

  const sectionItems = useMemo(() =>
    currentSection.items.map(item => ({
      item,
      result: inspection.items.find(r => r.templateItemId === item.id)!,
    })),
    [currentSection, inspection.items]
  );

  const isUnsafe = inspection.craneStatus === 'Unsafe to Operate';

  const defects = inspection.items.filter(i => i.result === 'defect');
  const totalCompleted = inspection.items.filter(i => i.result).length;
  const totalItems = inspection.items.length;
  const allComplete = totalCompleted === totalItems;

  const handlePass = useCallback((itemId: string) => {
    const existing = inspection.items.find(i => i.templateItemId === itemId)!;
    // Toggle: if already pass, unselect
    const newResult = existing.result === 'pass' ? undefined : 'pass' as const;
    dispatch({
      type: 'UPDATE_INSPECTION_ITEM',
      payload: {
        itemId,
        result: { ...existing, result: newResult },
      },
    });
    // Auto-save after each action
    setTimeout(() => dispatch({ type: 'SAVE_INSPECTION' }), 0);
  }, [dispatch, inspection.items]);

  const handleDefect = useCallback((itemId: string, result: InspectionItemResult) => {
    dispatch({
      type: 'UPDATE_INSPECTION_ITEM',
      payload: { itemId, result },
    });
    // Auto-save after each action
    setTimeout(() => dispatch({ type: 'SAVE_INSPECTION' }), 0);
  }, [dispatch]);

  const handleComplete = () => {
    if (defects.length > 0 && !inspection.craneStatus) {
      setShowStatusPicker(true);
      return;
    }
    dispatch({ type: 'COMPLETE_INSPECTION' });
  };

  const craneStatuses: CraneOperationalStatus[] = ['Safe to Operate', 'Operate with Limitations', 'Unsafe to Operate'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={crane.name}
        subtitle={`${totalCompleted}/${totalItems} items`}
        onBack={() => dispatch({ type: 'BACK_TO_CRANES' })}
        onNoteToAdmin={() => setNoteOpen(true)}
        unsafeBanner={isUnsafe}
      />

      <ProgressBar
        currentSection={currentSectionIdx}
        totalSections={sections.length}
        sectionNames={sections.map(s => s.name)}
      />

      {/* Section Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-muted/30 px-2 gap-1 py-1 no-scrollbar">
        {sections.map((sec, idx) => {
          const secItems = inspection.items.filter(i => i.sectionId === sec.id);
          const secDone = secItems.filter(i => i.result).length;
          const secTotal = secItems.length;
          return (
            <button
              key={sec.id}
              onClick={() => handleSectionChange(idx)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                idx === currentSectionIdx
                  ? 'bg-foreground text-background'
                  : secDone === secTotal && secTotal > 0
                  ? 'bg-rka-green-light text-rka-green-dark'
                  : 'text-muted-foreground active:bg-muted'
              }`}
            >
              {sec.name}
              <span className="ml-1 text-xs opacity-70">{secDone}/{secTotal}</span>
            </button>
          );
        })}
      </div>

      {/* Checklist Items */}
      <div className="flex-1">
        {sectionItems.map(({ item, result }) => (
          <ChecklistItem
            key={item.id}
            item={item}
            result={result}
            onPass={() => handlePass(item.id)}
            onDefect={(r) => handleDefect(item.id, r)}
            isActive={!result.result}
          />
        ))}
      </div>

      {/* Section Navigation */}
      <div className="px-4 py-2 border-t border-border flex gap-2">
        {currentSectionIdx > 0 && (
          <button
            onClick={() => handleSectionChange(currentSectionIdx - 1)}
            className="flex-1 tap-target bg-muted rounded-xl font-semibold text-sm"
          >
            ← {sections[currentSectionIdx - 1].name}
          </button>
        )}
        {currentSectionIdx < sections.length - 1 && (
          <button
            onClick={() => handleSectionChange(currentSectionIdx + 1)}
            className="flex-1 tap-target bg-foreground text-background rounded-xl font-semibold text-sm"
          >
            {sections[currentSectionIdx + 1].name} →
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2 bg-background">
        {inspection.status === 'completed' ? (
          <button
            onClick={() => dispatch({ type: 'REOPEN_INSPECTION' })}
            className="w-full tap-target bg-rka-orange text-destructive-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Re-open & Edit
          </button>
        ) : (
          <>
            <button
              onClick={() => dispatch({ type: 'SAVE_INSPECTION' })}
              className="w-full tap-target bg-muted rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={handleComplete}
              disabled={!allComplete}
              className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <CheckCircle className="w-5 h-5" />
              Complete Inspection ({totalCompleted}/{totalItems})
            </button>
          </>
        )}
      </div>

      {/* Crane Status Picker Modal */}
      {showStatusPicker && (
        <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end justify-center">
          <div className="bg-background w-full max-w-lg rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-rka-orange" />
              <h3 className="text-lg font-bold">Set Crane Status</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {defects.length} defect{defects.length !== 1 ? 's' : ''} found. Select the operational status:
            </p>
            {craneStatuses.map(status => (
              <button
                key={status}
                onClick={() => {
                  dispatch({ type: 'SET_CRANE_STATUS', payload: { status, overridden: true } });
                  setShowStatusPicker(false);
                  dispatch({ type: 'COMPLETE_INSPECTION' });
                }}
                className={`w-full tap-target rounded-xl font-bold text-base ${
                  status === 'Safe to Operate' ? 'bg-rka-green text-primary-foreground' :
                  status === 'Operate with Limitations' ? 'bg-rka-orange text-destructive-foreground' :
                  'bg-rka-red text-destructive-foreground'
                }`}
              >
                {status}
              </button>
            ))}
            <button
              onClick={() => setShowStatusPicker(false)}
              className="w-full tap-target bg-muted rounded-xl font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />
    </div>
  );
}
