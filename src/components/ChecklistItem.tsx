import { useState, useRef } from 'react';
import { Check, AlertTriangle, MessageCircle, Camera, X } from 'lucide-react';
import { InspectionItemResult, DefectType, DefectSeverity, RectificationTimeframe, TemplateItem } from '@/types/inspection';

interface ChecklistItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onPass: () => void;
  onDefect: (result: InspectionItemResult) => void;
  isActive: boolean;
}

const defectTypes: DefectType[] = ['Mechanical', 'Electrical', 'Structural', 'Safety Device', 'Operational', 'Cosmetic'];
const severities: DefectSeverity[] = ['Minor', 'Major', 'Critical'];
const timeframes: RectificationTimeframe[] = ['Immediately', 'Within 7 Days', 'Within 30 Days', 'Before Next Service'];

export function ChecklistItem({ item, result, onPass, onDefect, isActive }: ChecklistItemProps) {
  const [showExtras, setShowExtras] = useState(false);
  const [comment, setComment] = useState(result.comment || '');
  const [photos, setPhotos] = useState<string[]>(result.photos || []);
  const [defectType, setDefectType] = useState<DefectType>(result.defect?.defectType || 'Mechanical');
  const [severity, setSeverity] = useState<DefectSeverity>(result.defect?.severity || 'Minor');
  const [timeframe, setTimeframe] = useState<RectificationTimeframe>(result.defect?.rectificationTimeframe || 'Within 7 Days');
  const [action, setAction] = useState(result.defect?.recommendedAction || '');
  const [notes, setNotes] = useState(result.defect?.notes || '');
  const [defectPhotos, setDefectPhotos] = useState<string[]>(result.defect?.photos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defectFileInputRef = useRef<HTMLInputElement>(null);

  const isPass = result.result === 'pass';
  const isDefect = result.result === 'defect';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, forDefect: boolean) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (forDefect) {
          setDefectPhotos(prev => [...prev, dataUrl]);
        } else {
          setPhotos(prev => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (index: number, forDefect: boolean) => {
    if (forDefect) {
      setDefectPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDefectSave = () => {
    onDefect({
      ...result,
      result: 'defect',
      defect: {
        defectType,
        severity,
        rectificationTimeframe: timeframe,
        recommendedAction: action,
        notes,
        photos: defectPhotos,
      },
    });
  };

  return (
    <div
      className={`border-b border-border transition-all duration-200 ${
        isPass ? 'pass-row animate-flash-green' : isDefect ? 'defect-row' : ''
      }`}
    >
      <div className="px-4 py-3">
        <p className={`text-sm font-medium mb-3 leading-snug ${isPass ? 'text-rka-green-dark' : isDefect ? 'text-rka-red' : 'text-foreground'}`}>
          {item.label}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onPass}
            className={`flex-1 tap-target rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              isPass
                ? 'bg-rka-green text-primary-foreground shadow-md'
                : 'bg-rka-green/10 text-rka-green border-2 border-rka-green active:bg-rka-green active:text-primary-foreground'
            }`}
          >
            <Check className="w-5 h-5" />
            PASS
          </button>

          <button
            onClick={() => {
              if (!isDefect) {
                onDefect({ ...result, result: 'defect', defect: { defectType: 'Mechanical', severity: 'Minor', rectificationTimeframe: 'Within 7 Days', recommendedAction: '', notes: '', photos: [] } });
              }
            }}
            className={`flex-1 tap-target rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              isDefect
                ? 'bg-rka-red text-destructive-foreground shadow-md'
                : 'bg-rka-red/10 text-rka-red border-2 border-rka-red active:bg-rka-red active:text-destructive-foreground'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            DEFECT
          </button>

          {(isPass || isDefect) && (
            <button
              onClick={() => setShowExtras(!showExtras)}
              className={`tap-target w-12 rounded-lg flex items-center justify-center transition-all ${
                showExtras ? 'bg-foreground/10' : 'bg-muted'
              }`}
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Optional comment + photo for PASS */}
        {isPass && showExtras && (
          <div className="mt-3 space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comment (optional)..."
              className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none"
              rows={2}
            />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, false)}
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="tap-target w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground active:bg-muted"
              >
                <Camera className="w-5 h-5" />
                Tap to add photo (optional)
              </button>
              {photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, false)} className="absolute top-0 right-0 bg-rka-red text-destructive-foreground rounded-bl-lg p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Defect Detail Form */}
        {isDefect && (
          <div className="mt-3 space-y-3 bg-background rounded-lg p-3 border border-rka-red/20">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Defect Type *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {defectTypes.map(dt => (
                  <button
                    key={dt}
                    onClick={() => setDefectType(dt)}
                    className={`tap-target rounded-lg text-sm font-medium px-3 transition-all ${
                      defectType === dt
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground active:bg-foreground/20'
                    }`}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severity *</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {severities.map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`tap-target rounded-lg text-sm font-bold transition-all ${
                      severity === s
                        ? s === 'Critical' ? 'bg-rka-red text-destructive-foreground' : s === 'Major' ? 'bg-rka-orange text-destructive-foreground' : 'bg-rka-yellow text-foreground'
                        : 'bg-muted text-foreground active:bg-foreground/20'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rectification Timeframe *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`tap-target rounded-lg text-sm font-medium px-2 transition-all ${
                      timeframe === tf
                        ? tf === 'Immediately' ? 'bg-rka-red text-destructive-foreground' : 'bg-foreground text-background'
                        : 'bg-muted text-foreground active:bg-foreground/20'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended Action</label>
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="What should be done..."
                className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none mt-1"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none mt-1"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photos</label>
              <input
                ref={defectFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e, true)}
                multiple
              />
              <button
                onClick={() => defectFileInputRef.current?.click()}
                className="mt-1 tap-target w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground active:bg-muted"
              >
                <Camera className="w-5 h-5" />
                Tap to add photo
              </button>
              {defectPhotos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {defectPhotos.map((p, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i, true)} className="absolute top-0 right-0 bg-rka-red text-destructive-foreground rounded-bl-lg p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleDefectSave}
              className="w-full tap-target bg-foreground text-background rounded-lg font-bold text-sm"
            >
              Save Defect Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
