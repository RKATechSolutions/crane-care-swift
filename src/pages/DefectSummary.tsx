import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export default function DefectSummary() {
  const { state, dispatch } = useApp();
  const inspection = state.currentInspection!;
  const template = state.templates.find(t => t.id === inspection.templateId)!;

  const defects = inspection.items.filter(i => i.result === 'defect' && i.defect);

  const getItemLabel = (templateItemId: string) => {
    for (const sec of template.sections) {
      const item = sec.items.find(i => i.id === templateItemId);
      if (item) return item.label;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Defect Summary"
        subtitle={`${defects.length} defect${defects.length !== 1 ? 's' : ''} found`}
        onBack={() => dispatch({ type: 'BACK_TO_CRANES' })}
      />

      {defects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-bold">No Defects Found</p>
            <p className="text-muted-foreground text-sm">Crane passed all checks</p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          {defects.map((item, idx) => (
            <div key={item.templateItemId} className="border-b border-border p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  item.defect!.severity === 'Critical' ? 'bg-rka-red-light' :
                  item.defect!.severity === 'Major' ? 'bg-rka-orange-light' : 'bg-rka-yellow/20'
                }`}>
                  <AlertTriangle className={`w-4 h-4 ${
                    item.defect!.severity === 'Critical' ? 'text-rka-red' :
                    item.defect!.severity === 'Major' ? 'text-rka-orange' : 'text-rka-yellow'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{getItemLabel(item.templateItemId)}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.defect!.severity === 'Critical' ? 'bg-rka-red text-destructive-foreground' :
                      item.defect!.severity === 'Major' ? 'bg-rka-orange text-destructive-foreground' :
                      'bg-rka-yellow text-foreground'
                    }`}>
                      {item.defect!.severity}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">
                      {item.defect!.defectType}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">
                      {item.defect!.rectificationTimeframe}
                    </span>
                  </div>
                  {item.defect!.recommendedAction && (
                    <p className="text-xs text-muted-foreground mt-2">{item.defect!.recommendedAction}</p>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-border">
        <button
          onClick={() => dispatch({ type: 'BACK_TO_CRANES' })}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base"
        >
          Back to Crane List
        </button>
      </div>
    </div>
  );
}
