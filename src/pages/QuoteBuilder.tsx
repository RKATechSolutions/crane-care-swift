import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Plus, Trash2, Loader2, CheckCircle, Send, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { generateQuotePdf } from '@/utils/generateQuotePdf';

export interface QuoteLineItem {
  id: string;
  category: 'labour' | 'materials' | 'expenses';
  description: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  gstIncluded: boolean;
}

interface QuoteBuilderProps {
  onBack: () => void;
  prefilledDefects?: Array<{
    itemLabel: string;
    craneName: string;
    severity: string;
    defectType: string;
    notes: string;
    recommendedAction: string;
  }>;
}

const GST_RATE = 0.10;
const GP_TARGET = 0.50;
const LABOUR_COST_RATE = 117;
const LABOUR_SELL_RATE = 195;
const LABOUR_OT_SELL_RATE = 250;

export default function QuoteBuilder({ onBack, prefilledDefects }: QuoteBuilderProps) {
  const { state } = useApp();
  const site = state.selectedSite!;

  const [quoteName, setQuoteName] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [collateItems, setCollateItems] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sent, setSent] = useState(false);
  const [arofloQuoteNumber, setArofloQuoteNumber] = useState<string | null>(null);

  // Client info
  const [clientInfo, setClientInfo] = useState<any>(null);

  useEffect(() => {
    const fetchClient = async () => {
      const searchTerms = [
        site.name,
        site.name.split(' - ')[0],
        site.name.split(' ')[0],
      ];
      for (const term of searchTerms) {
        if (!term || term.length < 3) continue;
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .ilike('client_name', `%${term}%`)
          .limit(1);
        if (clients && clients.length > 0) {
          setClientInfo(clients[0]);
          break;
        }
      }
    };
    fetchClient();
  }, [site.name]);

  // Set default quote name
  useEffect(() => {
    const clientName = clientInfo?.client_name || site.name;
    const dateStr = format(new Date(), 'dd/MM/yyyy');
    setQuoteName(`${clientName} - Repair Quote - ${dateStr}`);
  }, [clientInfo, site.name]);

  // Pre-fill from defects
  useEffect(() => {
    if (prefilledDefects && prefilledDefects.length > 0 && lineItems.length === 0) {
      const items: QuoteLineItem[] = prefilledDefects.map((d, i) => ({
        id: `prefill-${i}`,
        category: 'labour' as const,
        description: `${d.craneName} — ${d.itemLabel}: ${d.recommendedAction || d.notes || d.defectType}`,
        quantity: 1,
        costPrice: LABOUR_COST_RATE,
        sellPrice: LABOUR_SELL_RATE,
        gstIncluded: false,
      }));
      setLineItems(items);
    }
  }, [prefilledDefects]);

  const addLineItem = (category: 'labour' | 'materials' | 'expenses') => {
    setLineItems(prev => [...prev, {
      id: `item-${Date.now()}`,
      category,
      description: '',
      quantity: 1,
      costPrice: category === 'labour' ? LABOUR_COST_RATE : 0,
      sellPrice: category === 'labour' ? LABOUR_SELL_RATE : 0,
      gstIncluded: false,
    }]);
  };

  const updateItem = (id: string, updates: Partial<QuoteLineItem>) => {
    setLineItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
  const totalCost = lineItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  const margin = subtotal - totalCost;
  const gst = subtotal * GST_RATE;
  const total = subtotal + gst;

  const grossProfit = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;
  const gpOnTarget = grossProfit >= GP_TARGET * 100;

  const labourItems = lineItems.filter(i => i.category === 'labour');
  const materialItems = lineItems.filter(i => i.category === 'materials');
  const expenseItems = lineItems.filter(i => i.category === 'expenses');

  const downloadPdf = (pdf: any, filename: string) => {
    try {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      pdf.save(filename);
    }
  };

  const handleSendQuote = async () => {
    if (lineItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    if (lineItems.some(i => !i.description.trim())) {
      toast.error('All line items need a description');
      return;
    }

    setSending(true);
    try {
      // 1. Create quote in AroFlo and get quote number
      const { data: arofloData, error: arofloError } = await supabase.functions.invoke('create-aroflo-quote', {
        body: {
          clientName: clientInfo?.client_name || site.name,
          siteName: site.name,
          siteAddress: clientInfo?.location_address || site.address,
          technicianName: state.currentUser?.name || 'Technician',
          jobDate: format(new Date(), 'yyyy-MM-dd'),
          quoteName,
          lineItems: lineItems.map(item => ({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            costPrice: item.costPrice,
            unitPrice: item.sellPrice,
          })),
          defects: prefilledDefects || [],
        },
      });

      if (arofloError) throw arofloError;
      if (!arofloData?.success) throw new Error(arofloData?.error || 'AroFlo error');

      const quoteNumber = arofloData.quoteId || 'PENDING';
      setArofloQuoteNumber(quoteNumber);

      // 2. Generate quote PDF
      const pdf = await generateQuotePdf({
        quoteName,
        quoteNumber,
        clientName: clientInfo?.client_name || site.name,
        clientAddress: clientInfo?.location_address || site.address || '',
        contactName: clientInfo?.primary_contact_name || '',
        contactEmail: clientInfo?.primary_contact_email || '',
        contactPhone: clientInfo?.primary_contact_mobile || '',
        technicianName: state.currentUser?.name || 'Technician',
        date: format(new Date(), 'dd/MM/yyyy'),
        validityDays,
        lineItems,
        subtotal,
        gst,
        total,
        notes,
        collateItems,
      });

      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const clientNameSafe = (clientInfo?.client_name || site.name).replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = format(new Date(), 'yyyyMMdd');
      const filename = `${clientNameSafe}_Quote_${dateStr}.pdf`;

      // Download PDF
      downloadPdf(pdf, filename);

      // 3. Email to customer if we have their email
      const recipientEmail = clientInfo?.primary_contact_email;
      if (recipientEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-report', {
          body: {
            to: recipientEmail,
            clientName: clientInfo?.primary_contact_name || site.contactName,
            siteName: clientInfo?.client_name || site.name,
            pdfBase64,
            filename,
            subject: `Quote: ${quoteName}`,
          },
        });

        if (emailError) {
          toast.error('Quote PDF downloaded but email failed. Check the email address.');
        } else {
          toast.success(`Quote emailed to ${recipientEmail}`);
        }
      } else {
        toast.info('Quote PDF downloaded. No client email on file — email not sent.');
      }

      // 4. Log as sent report
      dispatch({ type: 'ADD_SENT_REPORT', payload: {
        id: `quote-${Date.now()}`,
        type: 'email',
        title: quoteName,
        recipientName: clientInfo?.primary_contact_name,
        recipientEmail,
        sentAt: new Date().toISOString(),
        sentBy: state.currentUser?.name || 'Technician',
      }});

      setSent(true);
    } catch (err: any) {
      console.error('Quote send error:', err);
      toast.error(`Failed to create quote: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const { dispatch } = useApp();

  const handlePreviewPdf = async () => {
    try {
      const pdf = await generateQuotePdf({
        quoteName,
        quoteNumber: arofloQuoteNumber || 'DRAFT',
        clientName: clientInfo?.client_name || site.name,
        clientAddress: clientInfo?.location_address || site.address || '',
        contactName: clientInfo?.primary_contact_name || '',
        contactEmail: clientInfo?.primary_contact_email || '',
        contactPhone: clientInfo?.primary_contact_mobile || '',
        technicianName: state.currentUser?.name || 'Technician',
        date: format(new Date(), 'dd/MM/yyyy'),
        validityDays,
        lineItems,
        subtotal,
        gst,
        total,
        notes,
        collateItems,
      });
      const clientNameSafe = (clientInfo?.client_name || site.name).replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${clientNameSafe}_Quote_DRAFT.pdf`);
    } catch (err: any) {
      console.error('Preview PDF error:', err);
      toast.error(`Failed to generate PDF: ${err.message}`);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title="Quote Sent" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-rka-green-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-rka-green" />
            </div>
            <h2 className="text-2xl font-black mb-2">Quote Sent</h2>
            {arofloQuoteNumber && (
              <p className="text-sm font-bold text-primary mb-1">AroFlo Quote: {arofloQuoteNumber}</p>
            )}
            <p className="text-muted-foreground">PDF downloaded & synced to AroFlo</p>
            <p className="text-lg font-bold mt-3">${total.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">inc GST</span></p>
            <button
              onClick={onBack}
              className="mt-6 tap-target px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-base"
            >
              Back to Job Summary
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderLineItems = (items: QuoteLineItem[], category: string, categoryKey: 'labour' | 'materials' | 'expenses') => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</p>
        <button
          onClick={() => addLineItem(categoryKey)}
          className="text-xs font-bold text-primary flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2">No {category.toLowerCase()} items yet</p>
      )}
      {items.map(item => (
        <div key={item.id} className="border border-border rounded-xl p-3 mb-2 bg-background space-y-2">
          <div className="flex items-start gap-2">
            <textarea
              value={item.description}
              onChange={e => updateItem(item.id, { description: e.target.value })}
              placeholder={`${category} description...`}
              className="flex-1 p-2 border border-border rounded-lg bg-background text-sm resize-none"
              rows={2}
            />
            <button onClick={() => removeItem(item.id)} className="p-1.5 text-rka-red">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-border rounded-lg bg-background text-sm"
                min="0"
                step="0.5"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Cost (ex GST)</label>
              <input
                type="number"
                value={item.costPrice || ''}
                onChange={e => updateItem(item.id, { costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-border rounded-lg bg-background text-sm"
                min="0"
                step="0.01"
                placeholder="$0.00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Sell (ex GST)</label>
              <input
                type="number"
                value={item.sellPrice || ''}
                onChange={e => updateItem(item.id, { sellPrice: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-border rounded-lg bg-background text-sm"
                min="0"
                step="0.01"
                placeholder="$0.00"
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Margin: ${((item.sellPrice - item.costPrice) * item.quantity).toFixed(2)}</span>
            <span className="font-bold">${(item.quantity * item.sellPrice).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Create Quote"
        subtitle={clientInfo?.client_name || site.name}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Quote Header */}
        <div className="px-4 py-4 border-b border-border space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quote Name</label>
            <input
              value={quoteName}
              onChange={e => setQuoteName(e.target.value)}
              className="w-full p-3 border border-border rounded-xl bg-background text-sm font-medium mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</label>
              <p className="text-sm font-medium mt-1">{format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valid For (Days)</label>
              <input
                type="number"
                value={validityDays}
                onChange={e => setValidityDays(parseInt(e.target.value) || 30)}
                className="w-full p-2 border border-border rounded-lg bg-background text-sm mt-1"
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technician</label>
            <p className="text-sm font-medium mt-1">{state.currentUser?.name || '—'}</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="px-4 py-4 border-b border-border">
          {renderLineItems(labourItems, 'Labour', 'labour')}
          {renderLineItems(materialItems, 'Materials', 'materials')}
          {renderLineItems(expenseItems, 'Expenses', 'expenses')}
        </div>

        {/* Totals */}
        <div className="px-4 py-4 border-b border-border space-y-2">
          {/* Rate reference */}
          <div className="bg-muted rounded-lg p-2 mb-1">
            <p className="text-[10px] text-muted-foreground">
              Labour rates — Cost: ${LABOUR_COST_RATE}/hr · Sell: ${LABOUR_SELL_RATE}/hr · OT Sell: ${LABOUR_OT_SELL_RATE}/hr
            </p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cost</span>
            <span className="font-medium">${totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (ex GST)</span>
            <span className="font-bold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Margin ($)</span>
            <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-destructive'}`}>${margin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">GP Margin (target {GP_TARGET * 100}%)</span>
            <span className={`font-black text-base ${gpOnTarget ? 'text-green-600' : 'text-destructive'}`}>
              {grossProfit.toFixed(1)}%
              {gpOnTarget ? ' ✓' : ' ⚠️'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST (10%)</span>
            <span className="font-bold">${gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base border-t border-border pt-2">
            <span className="font-bold">Total (inc GST)</span>
            <span className="font-black text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Collate toggle */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Collate Items</p>
            <p className="text-xs text-muted-foreground">Show as single line item on quote PDF</p>
          </div>
          <button
            onClick={() => setCollateItems(!collateItems)}
            className={`w-12 h-7 rounded-full transition-colors relative ${collateItems ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${collateItems ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Notes */}
        <div className="px-4 py-4 border-b border-border">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Additional Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Terms, conditions, scope of works..."
            className="w-full p-3 border border-border rounded-xl bg-background text-sm resize-none mt-1"
            rows={3}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          onClick={handlePreviewPdf}
          className="w-full tap-target py-3 bg-muted text-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Preview Quote PDF
        </button>
        <button
          onClick={handleSendQuote}
          disabled={sending || lineItems.length === 0}
          className="w-full tap-target py-3 bg-rka-green text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating Quote...</>
          ) : (
            <><Send className="w-5 h-5" /> Send Quote to Customer & AroFlo</>
          )}
        </button>
      </div>
    </div>
  );
}
