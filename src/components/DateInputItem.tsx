import { useState } from 'react';
import { TemplateItem, InspectionItemResult } from '@/types/inspection';
import { Calendar } from 'lucide-react';

interface DateInputItemProps {
  item: TemplateItem;
  result: InspectionItemResult;
  onUpdate: (result: InspectionItemResult) => void;
}

export function DateInputItem({ item, result, onUpdate }: DateInputItemProps) {
  const [value, setValue] = useState(result.dateValue || '');

  const handleChange = (val: string) => {
    setValue(val);
    onUpdate({
      ...result,
      dateValue: val || undefined,
      result: val ? 'pass' : undefined,
    });
  };

  return (
    <div className={`border-b border-border transition-all ${value ? 'pass-row' : ''}`}>
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium leading-snug text-foreground flex-1">
          {item.label}
        </p>
        <div className="relative">
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-40 h-11 px-3 border border-border rounded-lg bg-background text-sm font-medium"
          />
        </div>
      </div>
    </div>
  );
}
