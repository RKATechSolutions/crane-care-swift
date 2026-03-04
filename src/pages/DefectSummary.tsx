import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { CraneOperationalStatus } from '@/types/inspection';
import { AlertTriangle, ZoomIn, X, Check } from 'lucide-react';

export default function DefectSummary() {
  const { state, dispatch } = useApp();
  const inspection = state.currentInspection!;
  const template = state.templates.find(t => t.id === inspection.templateId)!;
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const defects = inspection.items.filter(i => i.result === 'defect' && i.defect);

  const getItemLabel = (templateItemId: string) => {
    for (const sec of template.sections) {
      const item = sec.items.find(i => i.id === templateItemId);
      if (item) return item.label;
    }
    return '';
  };

  const craneStatuses: CraneOperationalStatus[] = ['Safe to Operate', 'Operate with Limitations', 'Unsafe to Operate'];

  const handleComplete = () => {
    if (defects.length > 0 && !inspection.craneStatus) {
      setShowStatusPicker(true);
      return;
    }
    dispatch({ type: 'SELECT_CRANE', payload: { id: '__site_summary__' } as any });
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
          {defects.map((item) => {
            const defectPhotos = item.defect?.photos || [];
            return (
              <div key={item.templateItemId} className="border-b border-border p-4 space-y-3">
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
                    {item.defect!.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">"{item.defect!.notes}"</p>
                    )}
                  </div>
                  {/* Defect photos on the right */}
                  {defectPhotos.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {defectPhotos.slice(0, 2).map((p, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-border cursor-pointer" onClick={() => setPreviewPhoto(p)}>
                          <img src={p} alt={`Defect ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 bg-foreground/60 text-background rounded-tr-lg p-0.5">
                            <ZoomIn className="w-3 h-3" />
                          </div>
                        </div>
                      ))}
                      {defectPhotos.length > 2 && (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          +{defectPhotos.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fix Now / Quote Later */}
                <div className="flex gap-2">
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Now' } })}
                    className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                      item.defect!.quoteStatus === 'Quote Now'
                        ? 'bg-rka-green text-primary-foreground'
                        : 'bg-muted text-foreground active:bg-foreground/10'
                    }`}
                  >
                    {item.defect!.quoteStatus === 'Quote Now' && <Check className="w-4 h-4 inline mr-1" />}
                    Fix Now
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'UPDATE_DEFECT_QUOTE', payload: { itemId: item.templateItemId, quoteStatus: 'Quote Later' } })}
                    className={`flex-1 tap-target rounded-lg text-sm font-bold transition-all ${
                      item.defect!.quoteStatus === 'Quote Later'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground active:bg-foreground/10'
                    }`}
                  >
                    {item.defect!.quoteStatus === 'Quote Later' && <Check className="w-4 h-4 inline mr-1" />}
                    Quote Later
                  </button>
                </div>

                {/* Per-defect comment */}
                <textarea
                  value={item.defect!.customerComment || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_DEFECT_DETAIL', payload: { itemId: item.templateItemId, updates: { customerComment: e.target.value } } })}
                  placeholder="Comment on this defect (optional)..."
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
                  rows={2}
                />

                {/* Internal quote instructions - admin only */}
                <div className="p-2.5 rounded-lg bg-rka-orange-light border border-rka-orange/20">
                  <label className="text-[10px] font-bold text-rka-orange uppercase tracking-wide flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Internal — Quote Instructions (Admin Only)
                  </label>
                  <textarea
                    value={item.defect!.quoteInstructions || ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_DEFECT_DETAIL', payload: { itemId: item.templateItemId, updates: { quoteInstructions: e.target.value } } })}
                    placeholder="Parts needed, access notes, pricing guidance..."
                    className="w-full p-2 border border-rka-orange/20 rounded-lg bg-background text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Asset Operational Status - at bottom AFTER reviewing defects */}
      {inspection.craneStatus && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Asset Operational Status</p>
          <div className={`w-full text-center py-3 rounded-xl font-bold text-base ${
            inspection.craneStatus === 'Safe to Operate' ? 'bg-rka-green text-primary-foreground' :
            inspection.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red text-destructive-foreground' :
            'bg-rka-orange text-destructive-foreground'
          }`}>
            {inspection.craneStatus}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <button
          onClick={handleComplete}
          className="w-full tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base"
        >
          Submit & Go to Job Site Summary
        </button>
      </div>

      {/* Status picker modal */}
      {showStatusPicker && (
        <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end justify-center">
          <div className="bg-background w-full max-w-lg rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-6 h-6 text-rka-orange" />
              <h3 className="text-lg font-bold">Set Asset Operational Status</h3>
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
                  dispatch({ type: 'SELECT_CRANE', payload: { id: '__site_summary__' } as any });
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

      {/* Fullscreen Photo Preview */}
      {previewPhoto && (
        <div className="fixed inset-0 z-[200] bg-foreground/90 flex items-center justify-center p-4" onClick={() => setPreviewPhoto(null)}>
          <button className="absolute top-4 right-4 bg-background rounded-full p-2 shadow-lg" onClick={() => setPreviewPhoto(null)}>
            <X className="w-6 h-6 text-foreground" />
          </button>
          <img src={previewPhoto} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
