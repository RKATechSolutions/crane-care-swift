import { useState, useRef, useCallback } from 'react';
import { Check, AlertTriangle, MessageCircle, Camera, X, ZoomIn } from 'lucide-react';
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export function ChecklistItem({ item, result, onPass, onDefect, isActive }: ChecklistItemProps) {
  const [showExtras, setShowExtras] = useState(false);
  const [comment, setComment] = useState(result.comment || '');
  const [photos, setPhotos] = useState<string[]>(result.photos || []);
  const [defectType, setDefectType] = useState<DefectType>(result.defect?.defectType || 'Mechanical');
  const [severity, setSeverity] = useState<DefectSeverity>(result.defect?.severity || 'Minor');
  const [timeframe, setTimeframe] = useState<RectificationTimeframe>(result.defect?.rectificationTimeframe || 'Within 7 Days');
  const [defectComment, setDefectComment] = useState(result.defect?.notes || '');
  const [defectPhotos, setDefectPhotos] = useState<string[]>(result.defect?.photos || []);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defectFileInputRef = useRef<HTMLInputElement>(null);

  const isPass = result.result === 'pass';
  const isDefect = result.result === 'defect';

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, forDefect: boolean) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploadError(null);

      const currentCount = forDefect ? defectPhotos.length : photos.length;
      const remaining = MAX_PHOTOS - currentCount;

      if (remaining <= 0) {
        setUploadError(`Maximum ${MAX_PHOTOS} photos allowed`);
        e.target.value = '';
        return;
      }

      const validFiles = Array.from(files).slice(0, remaining);

      for (const file of validFiles) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setUploadError('Invalid file type. Use JPG, PNG, or WebP');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setUploadError('File too large (max 10MB)');
          continue;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const dataUrl = ev.target?.result as string;
            if (forDefect) {
              setDefectPhotos(prev => [...prev, dataUrl]);
            } else {
              setPhotos(prev => [...prev, dataUrl]);
            }
          } catch (err) {
            console.error('Error processing photo:', err);
            setUploadError('Failed to process photo');
          }
        };
        reader.onerror = () => {
          console.error('FileReader error');
          setUploadError('Failed to read photo file');
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    } catch (err) {
      console.error('Photo upload error:', err);
      setUploadError('Failed to upload photo');
    }
  }, [defectPhotos.length, photos.length]);

  const removePhoto = (index: number, forDefect: boolean) => {
    if (forDefect) {
      setDefectPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDefectSave = () => {
    try {
      onDefect({
        ...result,
        result: 'defect',
        comment,
        photos,
        defect: {
          defectType,
          severity,
          rectificationTimeframe: timeframe,
          recommendedAction: '',
          notes: defectComment,
          photos: defectPhotos,
        },
      });
    } catch (err) {
      console.error('Error saving defect:', err);
    }
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
              if (isDefect) {
                // Unselect: clear defect
                onDefect({ ...result, result: undefined, defect: undefined, comment: undefined, photos: undefined });
              } else {
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
                disabled={photos.length >= MAX_PHOTOS}
                className="tap-target w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground active:bg-muted disabled:opacity-40"
              >
                <Camera className="w-5 h-5" />
                {photos.length > 0 ? `Add more (${photos.length}/${MAX_PHOTOS})` : 'Tap to add photo (optional)'}
              </button>
              {uploadError && <p className="text-xs text-rka-red mt-1">{uploadError}</p>}
              {photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border shadow-sm">
                      <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" onClick={() => setPreviewPhoto(p)} />
                      <button onClick={() => setPreviewPhoto(p)} className="absolute bottom-0 left-0 bg-foreground/60 text-background rounded-tr-lg p-1">
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button onClick={() => removePhoto(i, false)} className="absolute top-0 right-0 bg-rka-red text-destructive-foreground rounded-bl-lg p-1">
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comment (optional)</label>
              <textarea
                value={defectComment}
                onChange={(e) => setDefectComment(e.target.value)}
                placeholder="Add a comment..."
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
                disabled={defectPhotos.length >= MAX_PHOTOS}
                className="mt-1 tap-target w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground active:bg-muted disabled:opacity-40"
              >
                <Camera className="w-5 h-5" />
                {defectPhotos.length > 0 ? `Add more (${defectPhotos.length}/${MAX_PHOTOS})` : 'Tap to add photo'}
              </button>
              {uploadError && <p className="text-xs text-rka-red mt-1">{uploadError}</p>}
              {defectPhotos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {defectPhotos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border shadow-sm">
                      <img src={p} alt={`Defect photo ${i + 1}`} className="w-full h-full object-cover" onClick={() => setPreviewPhoto(p)} />
                      <button onClick={() => setPreviewPhoto(p)} className="absolute bottom-0 left-0 bg-foreground/60 text-background rounded-tr-lg p-1">
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button onClick={() => removePhoto(i, true)} className="absolute top-0 right-0 bg-rka-red text-destructive-foreground rounded-bl-lg p-1">
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

      {/* Fullscreen Photo Preview */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[200] bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button className="absolute top-4 right-4 bg-background rounded-full p-2 shadow-lg" onClick={() => setPreviewPhoto(null)}>
            <X className="w-6 h-6 text-foreground" />
          </button>
          <img src={previewPhoto} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
