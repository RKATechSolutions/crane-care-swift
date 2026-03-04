import { useRef } from 'react';
import { Camera, ImagePlus } from 'lucide-react';

interface DualPhotoButtonProps {
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'required' | 'small';
  multiple?: boolean;
}

export function DualPhotoButton({ onCapture, disabled, label, variant = 'default', multiple }: DualPhotoButtonProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCapture(e);
    e.target.value = '';
  };

  if (variant === 'small') {
    return (
      <div className="flex items-center gap-3">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" multiple={multiple} />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleChange} className="hidden" multiple={multiple} />
        <button onClick={() => cameraRef.current?.click()} disabled={disabled} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground active:text-foreground disabled:opacity-40">
          <Camera className="w-4 h-4" /> Take Photo
        </button>
        <button onClick={() => galleryRef.current?.click()} disabled={disabled} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground active:text-foreground disabled:opacity-40">
          <ImagePlus className="w-4 h-4" /> Upload
        </button>
      </div>
    );
  }

  const isRequired = variant === 'required';

  return (
    <div className="flex gap-2">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" multiple={multiple} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleChange} className="hidden" multiple={multiple} />
      <button
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        className={`flex-1 tap-target rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold active:bg-muted disabled:opacity-40 ${
          isRequired ? 'border-rka-red/50 text-rka-red' : 'border-border text-muted-foreground'
        }`}
      >
        <Camera className="w-4 h-4" />
        Take Photo
      </button>
      <button
        onClick={() => galleryRef.current?.click()}
        disabled={disabled}
        className={`flex-1 tap-target rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold active:bg-muted disabled:opacity-40 ${
          isRequired ? 'border-rka-red/50 text-rka-red' : 'border-border text-muted-foreground'
        }`}
      >
        <ImagePlus className="w-4 h-4" />
        Upload
      </button>
    </div>
  );
}
