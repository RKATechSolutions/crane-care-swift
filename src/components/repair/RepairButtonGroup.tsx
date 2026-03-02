interface RepairButtonGroupProps {
  options: string[];
  value: string | null;
  onChange: (val: string | null) => void;
  colorMap?: Record<string, string>;
}

export function RepairButtonGroup({ options, value, onChange, colorMap }: RepairButtonGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = value === opt;
        const customColor = colorMap?.[opt];
        return (
          <button
            key={opt}
            onClick={() => onChange(isSelected ? null : opt)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isSelected
                ? customColor || 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground border border-border'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
