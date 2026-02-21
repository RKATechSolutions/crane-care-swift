import { useState } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';
import { Check } from 'lucide-react';

interface SingleSelectItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function SingleSelectItem({ item, result, onUpdate }: SingleSelectItemProps) {
  const [comment, setComment] = useState(result.conditionalComment || '');
  const selectedValue = result.selectedValue;
  const needsComment = item.conditionalCommentOn && selectedValue === item.conditionalCommentOn;
  const isComplete = selectedValue && (!needsComment || comment.trim().length > 0);

  const handleSelect = (value: string) => {
    const newResult: InspectionItemResult = {
      ...result,
      selectedValue: value,
      result: 'pass', // mark as complete when selected
      conditionalComment: value === item.conditionalCommentOn ? comment : undefined,
    };
    // If switching away from conditional value, clear comment
    if (value !== item.conditionalCommentOn) {
      newResult.conditionalComment = undefined;
    }
    onUpdate(newResult);
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    onUpdate({
      ...result,
      conditionalComment: value,
      result: value.trim().length > 0 ? 'pass' : undefined,
    });
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
              className={`flex-1 min-w-[100px] tap-target rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                selectedValue === option
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-muted text-foreground active:bg-foreground/20'
              }`}
            >
              {selectedValue === option && <Check className="w-4 h-4" />}
              {option}
            </button>
          ))}
        </div>

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
          </div>
        )}
      </div>
    </div>
  );
}
