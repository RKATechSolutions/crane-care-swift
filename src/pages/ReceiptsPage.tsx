import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Camera, ArrowLeft, Send, Loader2, X, Receipt, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReceiptEntry {
  id: string;
  photo_url: string;
  merchant_name: string | null;
  amount: number | null;
  receipt_date: string | null;
  category: string;
  notes: string | null;
  status: string;
  xero_synced: boolean;
  created_at: string;
}

interface ReceiptsPageProps {
  onBack: () => void;
}

const CATEGORIES = ['Fuel', 'Tools', 'Parts', 'Meals', 'Accommodation', 'PPE', 'Other'];

export default function ReceiptsPage({ onBack }: ReceiptsPageProps) {
  const { state } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New receipt form
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const techId = state.currentUser?.id || '';
  const techName = state.currentUser?.name || '';

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('technician_id', techId)
      .order('created_at', { ascending: false });
    if (!error && data) setReceipts(data as ReceiptEntry[]);
    setLoading(false);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
    if (!showForm) setShowForm(true);
  };

  const resetForm = () => {
    setPhoto(null);
    setPhotoFile(null);
    setMerchantName('');
    setAmount('');
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setCategory('Other');
    setNotes('');
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      toast.error('Please take a photo of the receipt');
      return;
    }
    setSubmitting(true);
    try {
      const fileName = `${techId}/${Date.now()}-${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, photoFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('receipts').insert({
        technician_id: techId,
        technician_name: techName,
        photo_url: publicUrl,
        merchant_name: merchantName || null,
        amount: amount ? parseFloat(amount) : null,
        receipt_date: receiptDate || null,
        category,
        notes: notes || null,
      });
      if (insertError) throw insertError;

      toast.success('Receipt submitted!');
      resetForm();
      fetchReceipts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Receipts"
        subtitle="Capture & send to Xero"
        onBack={onBack}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Add Receipt Button */}
        {!showForm && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-8 bg-primary/10 rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center gap-3 active:scale-[0.97] transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">Take Photo of Receipt</p>
              <p className="text-xs text-muted-foreground">Snap or upload a receipt image</p>
            </div>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
        />

        {/* New Receipt Form */}
        {showForm && (
          <div className="bg-muted rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">New Receipt</h3>
              <button onClick={resetForm} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {photo && (
              <div className="relative">
                <img src={photo} alt="Receipt" className="w-full rounded-xl max-h-48 object-cover" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-background/80 backdrop-blur rounded-lg px-3 py-1 text-xs font-medium"
                >
                  Retake
                </button>
              </div>
            )}

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Merchant / Store name"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full bg-background rounded-xl px-4 py-3 text-sm border border-border"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-3 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background rounded-xl pl-8 pr-4 py-3 text-sm border border-border"
                  />
                </div>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="flex-1 bg-background rounded-xl px-4 py-3 text-sm border border-border"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border text-muted-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-background rounded-xl px-4 py-3 text-sm border border-border resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !photo}
              className="w-full h-12 rounded-xl font-bold text-base"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Receipt
                </>
              )}
            </Button>
          </div>
        )}

        {/* Receipt History */}
        <div>
          <h3 className="font-bold text-foreground mb-2">Recent Receipts</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No receipts submitted yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="bg-muted rounded-xl p-3 flex gap-3 items-center">
                  <img src={r.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {r.merchant_name || 'Unknown merchant'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.category} · {r.receipt_date || new Date(r.created_at).toLocaleDateString()}
                    </p>
                    {r.amount && (
                      <p className="text-sm font-bold text-foreground">${r.amount.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {r.xero_synced ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
