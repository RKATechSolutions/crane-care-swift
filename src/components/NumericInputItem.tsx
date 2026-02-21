import { useState } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';

interface NumericInputItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function NumericInputItem({ item, result, onUpdate }: NumericInputItemProps) {
  const [value, setValue] = useState(result.numericValue?.toString() || '');

  const handleChange = (inputVal: string) => {
    setValue(inputVal);
    const num = inputVal ? parseFloat(inputVal) : undefined;
    onUpdate({
      ...result,
      numericValue: num,
      result: 'pass', // numeric fields auto-pass (they're optional data capture)
    });
  };

  return (
    <div className={`border-b border-border transition-all ${value ? 'pass-row' : ''}`}>
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium leading-snug text-foreground flex-1">
          {item.label}
        </p>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="—"
          className="w-28 h-11 px-3 border border-border rounded-lg bg-background text-sm text-right font-medium"
        />
      </div>
    </div>
  );
}
