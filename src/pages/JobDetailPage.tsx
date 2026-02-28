import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  DollarSign, Clock, FileText, StickyNote, Paperclip,
  Plus, Trash2, TrendingUp, TrendingDown, ChevronRight,
  Send, Calendar, User, Wrench, Package
} from 'lucide-react';

interface JobDetailPageProps {
  jobId: string;
  onBack: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_name: string;
  created_by_name: string;
  client_name: string | null;
  job_type: string | null;
  scheduled_date: string | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

interface CostItem {
  id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  supplier: string;
  total: number;
}

interface NoteItem {
  id: string;
  text: string;
  created_at: string;
  author: string;
}

const JOB_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  crane_inspection: { label: 'Crane Inspection', color: 'bg-blue-500/15 text-blue-700' },
  lifting_inspection: { label: 'Lifting Inspection', color: 'bg-cyan-500/15 text-cyan-700' },
  crane_lifting_inspection: { label: 'Crane & Lifting', color: 'bg-indigo-500/15 text-indigo-700' },
  installation: { label: 'Installation', color: 'bg-purple-500/15 text-purple-700' },
  breakdown: { label: 'Breakdown', color: 'bg-red-500/15 text-red-700' },
  repair: { label: 'Repair', color: 'bg-amber-500/15 text-amber-700' },
  general: { label: 'General', color: 'bg-muted text-muted-foreground' },
};

export default function JobDetailPage({ jobId, onBack }: JobDetailPageProps) {
  const [job, setJob] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'costs' | 'notes' | 'documents'>('overview');

  // Local cost items (will be DB-backed later)
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNote, setNewNote] = useState('');

  // Add cost form
  const [showAddCost, setShowAddCost] = useState(false);
  const [costDesc, setCostDesc] = useState('');
  const [costQty, setCostQty] = useState('1');
  const [costUnitCost, setCostUnitCost] = useState('');
  const [costSupplier, setCostSupplier] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && data) setJob(data as Task);
      setLoading(false);
    };
    fetchJob();
  }, [jobId]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  // Mock profitability data (will be calculated from quote + costs later)
  const quoteValue = 0; // Will be linked to quotes table
  const invoiceValue = 0; // Will be added later
  const totalCosts = costs.reduce((sum, c) => sum + c.total, 0);
  const labourCost = 0; // Will come from time_entries
  const totalExpenses = totalCosts + labourCost;
  const profit = (invoiceValue || quoteValue) - totalExpenses;
  const margin = (invoiceValue || quoteValue) > 0 ? (profit / (invoiceValue || quoteValue)) * 100 : 0;

  const addCostItem = () => {
    if (!costDesc.trim() || !costUnitCost) { toast.error('Description and cost required'); return; }
    const qty = parseFloat(costQty) || 1;
    const uc = parseFloat(costUnitCost) || 0;
    setCosts(prev => [...prev, {
      id: `cost-${Date.now()}`,
      description: costDesc.trim(),
      quantity: qty,
      unit_cost: uc,
      supplier: costSupplier.trim(),
      total: qty * uc,
    }]);
    setCostDesc(''); setCostQty('1'); setCostUnitCost(''); setCostSupplier('');
    setShowAddCost(false);
    toast.success('Cost added');
  };

  const removeCost = (id: string) => {
    setCosts(prev => prev.filter(c => c.id !== id));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [{
      id: `note-${Date.now()}`,
      text: newNote.trim(),
      created_at: new Date().toISOString(),
      author: 'You',
    }, ...prev]);
    setNewNote('');
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title="Job Details" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  const jobCfg = JOB_TYPE_CONFIG[job.job_type || 'general'] || JOB_TYPE_CONFIG.general;
  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { key: 'costs' as const, label: 'Costs', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'notes' as const, label: 'Notes', icon: <StickyNote className="w-4 h-4" /> },
    { key: 'documents' as const, label: 'Docs', icon: <Paperclip className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title={job.title} onBack={onBack} />

      {/* Job header card */}
      <div className="px-4 py-3">
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${jobCfg.color}`}>{jobCfg.label}</Badge>
            <Badge className={`text-xs ${job.status === 'completed' ? 'bg-green-500/15 text-green-700' : 'bg-blue-500/15 text-blue-700'}`}>
              {job.status === 'completed' ? 'Completed' : 'Open'}
            </Badge>
          </div>
          {job.client_name && (
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">{job.client_name}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {job.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(job.scheduled_date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" /> {job.assigned_to_name}
            </span>
          </div>
          {job.description && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{job.description}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 flex gap-1 bg-background sticky top-0 z-10 border-b border-border pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            {/* Profitability summary */}
            <div className="bg-muted rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Profitability
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Quote Value</p>
                  <p className="text-lg font-bold text-foreground">${quoteValue.toLocaleString()}</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Invoice Value</p>
                  <p className="text-lg font-bold text-foreground">${invoiceValue.toLocaleString()}</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Total Costs</p>
                  <p className="text-lg font-bold text-foreground">${totalExpenses.toLocaleString()}</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Profit / GP%</p>
                  <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${profit.toLocaleString()}
                  </p>
                  <p className={`text-[10px] font-medium ${margin >= 50 ? 'text-green-600' : margin >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                    {margin.toFixed(1)}% GP
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Quote */}
            <div className="bg-muted rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" /> Linked Quote
              </h3>
              <p className="text-xs text-muted-foreground">No quote linked yet. Link a quote to track revenue.</p>
              <Button variant="outline" size="sm" className="mt-2 text-xs gap-1">
                <Plus className="w-3 h-3" /> Link Quote
              </Button>
            </div>

            {/* Time entries */}
            <div className="bg-muted rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Time Logged
              </h3>
              <p className="text-xs text-muted-foreground">No time entries for this job yet.</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total hours: <strong className="text-foreground">0h</strong></span>
                <span className="text-xs text-muted-foreground">Labour cost: <strong className="text-foreground">$0</strong></span>
              </div>
            </div>
          </>
        )}

        {/* COSTS TAB */}
        {tab === 'costs' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Materials & Costs</h3>
              <span className="text-xs font-bold text-foreground">Total: ${totalCosts.toLocaleString()}</span>
            </div>

            {costs.length === 0 && !showAddCost && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No costs recorded</p>
                <p className="text-xs mt-1">Add materials, parts or other expenses</p>
              </div>
            )}

            {costs.map(c => (
              <div key={c.id} className="bg-muted rounded-xl p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{c.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.quantity} × ${c.unit_cost.toFixed(2)} = <strong>${c.total.toFixed(2)}</strong>
                  </p>
                  {c.supplier && <p className="text-[10px] text-muted-foreground mt-0.5">Supplier: {c.supplier}</p>}
                </div>
                <button onClick={() => removeCost(c.id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {showAddCost ? (
              <div className="bg-muted rounded-xl p-4 space-y-2 border border-border">
                <p className="text-xs font-bold text-foreground">Add Cost Item</p>
                <Input placeholder="Description *" value={costDesc} onChange={e => setCostDesc(e.target.value)} />
                <div className="flex gap-2">
                  <Input placeholder="Qty" type="number" value={costQty} onChange={e => setCostQty(e.target.value)} className="w-20" />
                  <Input placeholder="Unit Cost *" type="number" value={costUnitCost} onChange={e => setCostUnitCost(e.target.value)} className="flex-1" />
                </div>
                <Input placeholder="Supplier" value={costSupplier} onChange={e => setCostSupplier(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={addCostItem} size="sm" className="flex-1">Add</Button>
                  <Button onClick={() => setShowAddCost(false)} size="sm" variant="outline">Cancel</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowAddCost(true)} variant="outline" className="w-full gap-2">
                <Plus className="w-4 h-4" /> Add Cost
              </Button>
            )}
          </>
        )}

        {/* NOTES TAB */}
        {tab === 'notes' && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                className="flex-1"
              />
              <Button onClick={addNote} size="icon" disabled={!newNote.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {notes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No notes yet</p>
                <p className="text-xs mt-1">Add notes about this job</p>
              </div>
            )}

            {notes.map(n => (
              <div key={n.id} className="bg-muted rounded-xl p-3">
                <p className="text-sm text-foreground">{n.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {n.author} · {formatDate(n.created_at)}
                </p>
              </div>
            ))}
          </>
        )}

        {/* DOCUMENTS TAB */}
        {tab === 'documents' && (
          <>
            <div className="text-center py-8 text-muted-foreground">
              <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No documents attached</p>
              <p className="text-xs mt-1">Upload invoices, photos or other files</p>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" /> Upload Document
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
