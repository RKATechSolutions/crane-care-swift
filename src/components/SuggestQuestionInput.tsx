import { useState } from 'react';
import { Lightbulb, X, Send } from 'lucide-react';

interface SuggestQuestionInputProps {
  sectionId: string;
  sectionName: string;
  onSubmit: (sectionId: string, question: string) => void;
  existingSuggestions: { question: string; status: string }[];
}

export function SuggestQuestionInput({ sectionId, sectionName, onSubmit, existingSuggestions }: SuggestQuestionInputProps) {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const q = value.trim();
    if (!q) return;
    onSubmit(sectionId, q);
    setValue('');
    setShowInput(false);
  };

  const sectionSuggestions = existingSuggestions.filter(s => s.status === 'pending');

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/20">
      {/* Existing suggestions */}
      {sectionSuggestions.map((s, i) => (
        <div key={i} className="flex items-center gap-2 mb-2 text-xs text-rka-orange font-medium">
          <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">"{s.question}" — pending admin approval</span>
        </div>
      ))}

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground active:text-foreground"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Suggest a question for this section
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Suggest a question for "{sectionName}"
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type your suggested question..."
              className="flex-1 p-2 border border-border rounded-lg bg-background text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="px-3 py-2 bg-rka-orange text-destructive-foreground rounded-lg text-sm font-bold disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowInput(false); setValue(''); }}
              className="px-2 py-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            This question will be used for this inspection only. An admin must approve it before it appears in future forms.
          </p>
        </div>
      )}
    </div>
  );
}

