interface ProgressBarProps {
  currentSection: number;
  totalSections: number;
  sectionNames: string[];
}

export function ProgressBar({ currentSection, totalSections, sectionNames }: ProgressBarProps) {
  return (
    <div className="bg-muted/50 px-4 py-3 border-b border-border sticky top-0 z-30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold">
          {sectionNames[currentSection]} ({currentSection + 1} of {totalSections})
        </span>
      </div>
      <div className="flex gap-1">
        {sectionNames.map((name, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              i < currentSection
                ? 'bg-rka-green'
                : i === currentSection
                ? 'bg-primary'
                : 'bg-border'
            }`}
            title={name}
          />
        ))}
      </div>
    </div>
  );
}
