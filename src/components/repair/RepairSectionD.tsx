import { useState } from 'react';
import { RepairFormData } from '@/pages/RepairBreakdownForm';
import { RepairButtonGroup } from './RepairButtonGroup';
import { supabase } from '@/integrations/supabase/client';
import { Camera, X, Plus, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  formData: RepairFormData;
  updateForm: (updates: Partial<RepairFormData>) => void;
}

const RETURN_OPTIONS = ['Yes – Fully Operational', 'Yes – Restricted Operation', 'No – Remains Isolated'];

const COLOR_MAP: Record<string, string> = {
  'Yes – Fully Operational': 'bg-rka-green text-primary-foreground',
  'No – Remains Isolated': 'bg-destructive text-destructive-foreground',
};

export function RepairSectionD({ formData, updateForm }: Props) {
  const [uploading, setUploading] = useState(false);
  const needsExplanation = formData.return_to_service === 'Yes – Restricted Operation' || formData.return_to_service === 'No – Remains Isolated';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newPhotos: string[] = [];
      for (const file of Array.from(files)) {
        const fileName = `repair-rts-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('job-documents').upload(fileName, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('job-documents').getPublicUrl(fileName);
        newPhotos.push(urlData.publicUrl);
      }
      updateForm({ return_to_service_photos: [...(formData.return_to_service_photos || []), ...newPhotos] });
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (idx: number) => {
    updateForm({ return_to_service_photos: (formData.return_to_service_photos || []).filter((_, i) => i !== idx) });
  };

  const photos = formData.return_to_service_photos || [];

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Crane Returned to Service? *</label>
        <RepairButtonGroup
          options={RETURN_OPTIONS}
          value={formData.return_to_service}
          onChange={v => updateForm({ return_to_service: v })}
          colorMap={COLOR_MAP}
        />
      </div>

      {needsExplanation && (
        <textarea
          placeholder="Explain the restriction or isolation reason…"
          value={formData.return_to_service_explanation}
          onChange={e => updateForm({ return_to_service_explanation: e.target.value })}
          className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-none"
          rows={3}
        />
      )}

      {/* Photo Upload */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Photos (Optional)</label>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-0.5 right-0.5 bg-foreground/70 text-background rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          id="repair-camera-input"
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <input
          id="repair-gallery-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <div className="flex gap-2">
          <button
            onClick={() => document.getElementById('repair-camera-input')?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-all"
          >
            <Camera className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Take Photo'}
          </button>
          <button
            onClick={() => document.getElementById('repair-gallery-input')?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-border text-sm font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50 transition-all"
          >
            <ImagePlus className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
