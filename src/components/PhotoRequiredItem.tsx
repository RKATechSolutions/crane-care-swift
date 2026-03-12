import { useState, useRef } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';
import { Camera, X, CheckCircle, ImagePlus } from 'lucide-react';
import { compressImage } from '@/utils/uploadHelper';

interface PhotoRequiredItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function PhotoRequiredItem({ item, result, onUpdate }: PhotoRequiredItemProps) {
  const [photos, setPhotos] = useState<string[]>(result.photos || []);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImage(file);
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
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
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

        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            onChange={handleCapture}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 tap-target bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-dashed border-primary/30"
          >
            <Camera className="w-5 h-5" />
            Take Photo
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex-1 tap-target bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-dashed border-primary/30"
          >
            <ImagePlus className="w-5 h-5" />
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
