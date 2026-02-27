import { useState, useRef } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';
import { Camera, X, CheckCircle } from 'lucide-react';

interface PhotoRequiredItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function PhotoRequiredItem({ item, result, onUpdate }: PhotoRequiredItemProps) {
  const [photos, setPhotos] = useState<string[]>(result.photos || []);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = [...photos, dataUrl];
      setPhotos(updated);
      onUpdate({
        ...result,
        photos: updated,
        result: 'pass',
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    const updated = photos.filter((_, i) => i !== idx);
    setPhotos(updated);
    onUpdate({
      ...result,
      photos: updated,
      result: updated.length > 0 ? 'pass' : undefined,
    });
  };

  const hasPhotos = photos.length > 0;

  return (
    <div className={`border-b border-border transition-all ${hasPhotos ? 'pass-row' : ''}`}>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium leading-snug text-foreground flex-1">
            {item.label}
          </p>
          {hasPhotos && <CheckCircle className="w-5 h-5 text-rka-green flex-shrink-0" />}
        </div>

        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full tap-target bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-dashed border-primary/30"
        >
          <Camera className="w-5 h-5" />
          {hasPhotos ? 'Add Another Photo' : 'Take / Upload Photo (Required)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
        />
      </div>
    </div>
  );
}
