import { useState } from 'react';
import { Lightbulb, X, Send } from 'lucide-react';

interface SuggestQuestionInputProps {
  sectionId: string;
  sectionName: string;
  onSubmit: (sectionId: string, question: string, answer: string) => void;
  existingSuggestions: { question: string; answer?: string; status: string }[];
}

export function SuggestQuestionInput({ sectionId, sectionName, onSubmit, existingSuggestions }: SuggestQuestionInputProps) {
  const [showInput, setShowInput] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    const q = question.trim();
    const a = answer.trim();
    if (!q || !a) return;
    onSubmit(sectionId, q, a);
    setQuestion('');
    setAnswer('');
    setShowInput(false);
  };

  const sectionSuggestions = existingSuggestions.filter(s => s.status === 'pending');

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/20">
      {sectionSuggestions.map((s, i) => (
        <div key={i} className="mb-2 p-2 rounded-lg bg-rka-orange/10 border border-rka-orange/30">
          <div className="flex items-center gap-2 text-xs text-rka-orange font-medium">
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Pending admin approval</span>
          </div>
          <p className="text-sm font-medium mt-1">Q: {s.question}</p>
          {s.answer && <p className="text-sm text-muted-foreground">A: {s.answer}</p>}
        </div>
      ))}

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground active:text-foreground"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Add a question & answer for this section
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Add Q&A for "{sectionName}"
          </p>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type the question..."
            className="w-full p-2 border border-border rounded-lg bg-background text-sm"
            autoFocus
          />
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type the answer..."
            className="w-full p-2 border border-border rounded-lg bg-background text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!question.trim() || !answer.trim()}
              className="flex-1 px-3 py-2 bg-rka-orange text-destructive-foreground rounded-lg text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1"
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
            <button
              onClick={() => { setShowInput(false); setQuestion(''); setAnswer(''); }}
              className="px-3 py-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            This Q&A will appear on the current report. An admin must approve it before it appears in future forms.
          </p>
        </div>
      )}
    </div>
  );
}
