import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { AdminNoteCategory } from '@/types/inspection';
import { useApp } from '@/contexts/AppContext';

interface NoteToAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories: AdminNoteCategory[] = [
  'App bug / form not working',
  'Missing option / dropdown update needed',
  'Access issue / incomplete inspection',
  'Customer request',
  'Other',
];

export function NoteToAdminModal({ isOpen, onClose }: NoteToAdminModalProps) {
  const { state, dispatch } = useApp();
  const [category, setCategory] = useState<AdminNoteCategory>('Other');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!message.trim()) return;
    dispatch({
      type: 'ADD_ADMIN_NOTE',
      payload: {
        id: `note-${Date.now()}`,
        technicianId: state.currentUser?.id || '',
        technicianName: state.currentUser?.name || '',
        siteId: state.selectedSite?.id,
        craneId: state.selectedCrane?.id,
        category,
        message,
        timestamp: new Date().toISOString(),
      },
    });
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
      setCategory('Other');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold">Note to Admin</h2>
          <button onClick={onClose} className="tap-target flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-bold">Note sent successfully</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <div className="space-y-2 mt-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`w-full tap-target rounded-lg text-sm font-medium text-left px-4 transition-all ${
                      category === cat
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground active:bg-foreground/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full p-3 border border-border rounded-lg bg-background text-sm resize-none mt-1"
                rows={4}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photo (optional)</label>
              <button className="mt-1 tap-target w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                📷 Tap to add photo
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="w-full tap-target bg-primary text-primary-foreground rounded-lg font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
              Send Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
