import { useState } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';

interface TextInputItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function TextInputItem({ item, result, onUpdate }: TextInputItemProps) {
  const [value, setValue] = useState(result.textValue || '');

  const handleChange = (val: string) => {
    setValue(val);
    onUpdate({
      ...result,
      textValue: val || undefined,
      result: val.trim() ? 'pass' : undefined,
    });
  };

  return (
    <div className={`border-b border-border transition-all ${value.trim() ? 'pass-row' : ''}`}>
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-medium leading-snug text-foreground">
          {item.label}
        </p>
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter notes…"
          rows={2}
          className="w-full p-2.5 border border-border rounded-lg bg-background text-sm resize-none"
        />
      </div>
    </div>
  );
}
