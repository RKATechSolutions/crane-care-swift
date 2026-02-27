import { useState, useRef } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';
import { Check, Camera, X, Lightbulb } from 'lucide-react';

interface SingleSelectItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function SingleSelectItem({ item, result, onUpdate }: SingleSelectItemProps) {
  const [comment, setComment] = useState(result.conditionalComment || '');
  const [optComment, setOptComment] = useState(result.comment || '');
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestInput, setSuggestInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedValue = result.selectedValue;
  const isSuggested = !!result.suggestedValue && selectedValue === result.suggestedValue;
  const needsComment = item.conditionalCommentOn && selectedValue === item.conditionalCommentOn;
  const isYesNo = item.options?.length === 2 && item.options.includes('Yes') && item.options.includes('No');
  const isComplete = selectedValue && (!needsComment || comment.trim().length > 0);

  const photos = result.photos || [];

  const handleSelect = (value: string) => {
    const newResult: InspectionItemResult = {
      ...result,
      selectedValue: value,
      result: 'pass',
      conditionalComment: value === item.conditionalCommentOn ? comment : undefined,
    };
    if (value !== item.conditionalCommentOn) {
      newResult.conditionalComment = undefined;
    }
    onUpdate(newResult);
  };

  const handleSuggestSubmit = () => {
    const val = suggestInput.trim();
    if (!val) return;
    onUpdate({
      ...result,
      selectedValue: val,
      suggestedValue: val,
      result: 'pass',
    });
    setShowSuggest(false);
    setSuggestInput('');
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    onUpdate({
      ...result,
      conditionalComment: value,
      result: value.trim().length > 0 ? 'pass' : undefined,
    });
  };

  const handleOptCommentChange = (value: string) => {
    setOptComment(value);
    onUpdate({ ...result, comment: value });
  };

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newPhotos = [...photos, dataUrl].slice(0, 5);
      onUpdate({ ...result, photos: newPhotos });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    const newPhotos = photos.filter((_, i) => i !== idx);
    onUpdate({ ...result, photos: newPhotos });
  };

  const getButtonStyle = (option: string) => {
    if (selectedValue !== option) {
      return 'bg-muted text-foreground active:bg-foreground/20';
    }
    if (isYesNo) {
      return option === 'Yes'
        ? 'bg-rka-green text-primary-foreground shadow-md'
        : 'bg-rka-red text-destructive-foreground shadow-md';
    }
    return 'bg-foreground text-background shadow-md';
  };

  return (
    <div className={`border-b border-border transition-all ${isComplete ? 'pass-row' : ''}`}>
      <div className="px-4 py-3">
        <p className={`text-sm font-medium mb-3 leading-snug ${isComplete ? 'text-rka-green-dark' : 'text-foreground'}`}>
          {item.label}
          {item.required && <span className="text-rka-red ml-1">*</span>}
        </p>

        <div className="flex gap-2 flex-wrap">
          {item.options?.map(option => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`flex-1 min-w-[100px] tap-target rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${getButtonStyle(option)}`}
            >
              {selectedValue === option && <Check className="w-4 h-4" />}
              {option}
            </button>
          ))}
        </div>

        {/* Conditional required comment */}
        {needsComment && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-rka-red uppercase tracking-wide">Comment Required *</label>
            <textarea
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Please provide details..."
              className="w-full p-3 border border-rka-red/30 rounded-lg bg-background text-sm resize-none mt-1"
              rows={2}
            />
            {/* Photo upload for conditional comment */}
            <div className="mt-2">
              <button
                onClick={handlePhotoCapture}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground active:text-foreground"
              >
                <Camera className="w-4 h-4" /> Add Photo
              </button>
            </div>
          </div>
        )}

        {/* Optional comment & photo (e.g. Log Book Present) */}
        {item.optionalComment && !needsComment && selectedValue && (
          <div className="mt-3">
            <textarea
              value={optComment}
              onChange={(e) => handleOptCommentChange(e.target.value)}
              placeholder="Optional comment..."
              className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none"
              rows={2}
            />
          </div>
        )}

        {(item.optionalPhoto || needsComment) && selectedValue && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            {!needsComment && (
              <div className="mt-2">
                <button
                  onClick={handlePhotoCapture}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground active:text-foreground"
                >
                  <Camera className="w-4 h-4" /> Add Photo
                </button>
              </div>
            )}
            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0 right-0 bg-rka-red text-white rounded-bl-lg p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
