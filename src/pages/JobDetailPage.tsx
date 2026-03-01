import { useState, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  DollarSign, Clock, FileText, StickyNote, Paperclip,
  Plus, Trash2, TrendingUp,
  Send, Calendar, User, Wrench, Package
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

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
  supplier: string | null;
  total: number;
  cost_type: 'material' | 'labour';
}

interface NoteItem {
  id: string;
  text: string;
  created_at: string;
  author: string;
}

interface DocItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
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
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [job, setJob] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'costs' | 'notes' | 'documents'>('overview');

  const [costs, setCosts] = useState<CostItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [newNote, setNewNote] = useState('');
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  const [showAddCost, setShowAddCost] = useState<'material' | 'labour' | null>(null);
  const [costDesc, setCostDesc] = useState('');
  const [costQty, setCostQty] = useState('1');
  const [costUnitCost, setCostUnitCost] = useState('');
  const [costSupplier, setCostSupplier] = useState('');
  const [labourChargeRate, setLabourChargeRate] = useState('195');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch job + related data
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [jobRes, costsRes, notesRes, docsRes, timeRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', jobId).single(),
        supabase.from('job_costs').select('*').eq('task_id', jobId).order('created_at', { ascending: false }),
        supabase.from('job_notes').select('*').eq('task_id', jobId).order('created_at', { ascending: false }),
        supabase.from('job_documents').select('*').eq('task_id', jobId).order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').eq('task_id', jobId).order('created_at', { ascending: false }),
      ]);
      if (!jobRes.error && jobRes.data) setJob(jobRes.data as Task);
      if (!costsRes.error && costsRes.data) setCosts(costsRes.data as CostItem[]);
      if (!notesRes.error && notesRes.data) setNotes(notesRes.data as NoteItem[]);
      if (!docsRes.error && docsRes.data) setDocs(docsRes.data as DocItem[]);
      if (!timeRes.error && timeRes.data) setTimeEntries(timeRes.data);
      setLoading(false);
    };
    fetchAll();
  }, [jobId]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const materialCosts = costs.filter(c => c.cost_type === 'material');
  const labourCosts = costs.filter(c => c.cost_type === 'labour');
  const totalMaterials = materialCosts.reduce((sum, c) => sum + (c.total ?? c.quantity * c.unit_cost), 0);
  const totalLabour = labourCosts.reduce((sum, c) => sum + (c.total ?? c.quantity * c.unit_cost), 0);
  const totalCosts = totalMaterials + totalLabour;
  const quoteValue = 0;
  const invoiceValue = 0;
  const totalExpenses = totalCosts;
  const profit = (invoiceValue || quoteValue) - totalExpenses;
  const margin = (invoiceValue || quoteValue) > 0 ? (profit / (invoiceValue || quoteValue)) * 100 : 0;

  const addCostItem = async () => {
    if (!costDesc.trim() || !costUnitCost || !showAddCost) { toast.error('Description and cost required'); return; }
    const qty = parseFloat(costQty) || 1;
    const uc = parseFloat(costUnitCost) || 0;
    const { data, error } = await supabase.from('job_costs').insert({
      task_id: jobId,
      description: costDesc.trim(),
      quantity: qty,
      unit_cost: uc,
      supplier: costSupplier.trim() || null,
      cost_type: showAddCost,
    }).select().single();
    if (error) { toast.error('Failed to save cost'); return; }
    setCosts(prev => [data as CostItem, ...prev]);

    // If labour, also create a time_entry linked to this job
    if (showAddCost === 'labour' && currentUser) {
      const today = new Date().toISOString().split('T')[0];
      const { data: teData } = await supabase.from('time_entries').insert({
        task_id: jobId,
        technician_id: currentUser.id,
        technician_name: currentUser.name,
        entry_date: today,
        entry_type: 'repair' as const,
        hours: qty,
        description: `${costDesc.trim()} — ${job?.title || 'Job'}`,
        client_name: job?.client_name || null,
      }).select().single();
      if (teData) setTimeEntries(prev => [teData, ...prev]);
    }

    setCostDesc(''); setCostQty('1'); setCostUnitCost(''); setCostSupplier(''); setLabourChargeRate('195');
    setShowAddCost(null);
    toast.success('Cost added');
  };

  const removeCost = async (id: string) => {
    const { error } = await supabase.from('job_costs').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setCosts(prev => prev.filter(c => c.id !== id));
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data, error } = await supabase.from('job_notes').insert({
      task_id: jobId,
      text: newNote.trim(),
      author: 'You',
    }).select().single();
    if (error) { toast.error('Failed to save note'); return; }
    setNotes(prev => [data as NoteItem, ...prev]);
    setNewNote('');
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('job_notes').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const uploadDocument = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${jobId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('job-documents').upload(path, file);
    if (uploadErr) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('job-documents').getPublicUrl(path);
    const { data, error } = await supabase.from('job_documents').insert({
      task_id: jobId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type || null,
      uploaded_by: 'You',
    }).select().single();
    if (error) { toast.error('Failed to save document record'); setUploading(false); return; }
    setDocs(prev => [data as DocItem, ...prev]);
    setUploading(false);
    toast.success('Document uploaded');
  };

  const deleteDoc = async (doc: DocItem) => {
    await supabase.from('job_documents').delete().eq('id', doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
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
                  <p className="text-[10px] text-muted-foreground font-medium">Materials</p>
                  <p className="text-lg font-bold text-foreground">${totalMaterials.toLocaleString()}</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Labour</p>
                  <p className="text-lg font-bold text-foreground">${totalLabour.toLocaleString()}</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center col-span-2">
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

            <div className="bg-muted rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" /> Linked Quote
              </h3>
              <p className="text-xs text-muted-foreground">No quote linked yet. Link a quote to track revenue.</p>
              <Button variant="outline" size="sm" className="mt-2 text-xs gap-1">
                <Plus className="w-3 h-3" /> Link Quote
              </Button>
            </div>

            <div className="bg-muted rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Time Logged
              </h3>
              {timeEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No time entries for this job yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {timeEntries.map((te: any) => (
                    <div key={te.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{te.technician_name} — {te.description || te.entry_type}</span>
                      <span className="font-semibold text-foreground">{te.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total hours: <strong className="text-foreground">{timeEntries.reduce((s: number, t: any) => s + Number(t.hours), 0)}h</strong></span>
                <span className="text-xs text-muted-foreground">Labour cost: <strong className="text-foreground">${(timeEntries.reduce((s: number, t: any) => s + Number(t.hours), 0) * 117).toLocaleString()}</strong></span>
              </div>
            </div>
          </>
        )}

        {/* COSTS TAB */}
        {tab === 'costs' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Job Costs</h3>
              <div className="flex gap-3 text-xs font-bold text-foreground">
                <span>Materials: ${totalMaterials.toLocaleString()}</span>
                <span>Labour: ${totalLabour.toLocaleString()}</span>
              </div>
            </div>

            {/* MATERIALS SECTION */}
            <div className="bg-muted rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Materials & Parts
                </h4>
                <span className="text-[10px] font-semibold text-muted-foreground">${totalMaterials.toLocaleString()}</span>
              </div>

              {materialCosts.length === 0 && showAddCost !== 'material' && (
                <p className="text-xs text-muted-foreground text-center py-2">No materials recorded</p>
              )}

              {materialCosts.map(c => (
                <div key={c.id} className="bg-background rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.quantity} × ${c.unit_cost.toFixed(2)} = <strong>${(c.total ?? c.quantity * c.unit_cost).toFixed(2)}</strong>
                    </p>
                    {c.supplier && <p className="text-[10px] text-muted-foreground mt-0.5">Supplier: {c.supplier}</p>}
                  </div>
                  <button onClick={() => removeCost(c.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {showAddCost === 'material' ? (
                <div className="bg-background rounded-lg p-3 space-y-2 border border-border">
                  <p className="text-xs font-bold text-foreground">Add Material</p>
                  <Input placeholder="Description *" value={costDesc} onChange={e => setCostDesc(e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="Qty" type="number" value={costQty} onChange={e => setCostQty(e.target.value)} className="w-20" />
                    <Input placeholder="Unit Cost *" type="number" value={costUnitCost} onChange={e => setCostUnitCost(e.target.value)} className="flex-1" />
                  </div>
                  <Input placeholder="Supplier" value={costSupplier} onChange={e => setCostSupplier(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={addCostItem} size="sm" className="flex-1">Add</Button>
                    <Button onClick={() => setShowAddCost(null)} size="sm" variant="outline">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowAddCost('material')} variant="outline" size="sm" className="w-full gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Add Material
                </Button>
              )}
            </div>

            {/* LABOUR SECTION */}
            <div className="bg-muted rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Labour
                </h4>
                <span className="text-[10px] font-semibold text-muted-foreground">${totalLabour.toLocaleString()}</span>
              </div>

              {labourCosts.length === 0 && showAddCost !== 'labour' && (
                <p className="text-xs text-muted-foreground text-center py-2">No labour costs recorded</p>
              )}

              {labourCosts.map(c => (
                <div key={c.id} className="bg-background rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.quantity} hrs × ${c.unit_cost.toFixed(2)}/hr = <strong>${(c.total ?? c.quantity * c.unit_cost).toFixed(2)}</strong>
                    </p>
                  </div>
                  <button onClick={() => removeCost(c.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {showAddCost === 'labour' ? (
                <div className="bg-background rounded-lg p-3 space-y-2 border border-border">
                  <p className="text-xs font-bold text-foreground">Add Labour</p>
                  <Input placeholder="Description *" value={costDesc} onChange={e => setCostDesc(e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="Hours" type="number" value={costQty} onChange={e => setCostQty(e.target.value)} className="w-20" />
                    <Input placeholder="Rate $/hr *" type="number" value={costUnitCost} onChange={e => setCostUnitCost(e.target.value)} className="flex-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addCostItem} size="sm" className="flex-1">Add</Button>
                    <Button onClick={() => setShowAddCost(null)} size="sm" variant="outline">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => { setShowAddCost('labour'); setCostUnitCost('117'); setLabourChargeRate('195'); }} variant="outline" size="sm" className="w-full gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Add Labour
                </Button>
              )}
            </div>

            {/* TOTAL */}
            <div className="bg-primary/10 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Total Job Cost</span>
              <span className="text-lg font-bold text-foreground">${totalCosts.toLocaleString()}</span>
            </div>
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
              <div key={n.id} className="bg-muted rounded-xl p-3 group relative">
                <p className="text-sm text-foreground">{n.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {n.author} · {formatDate(n.created_at)}
                </p>
                <button onClick={() => deleteNote(n.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </>
        )}

        {/* DOCUMENTS TAB */}
        {tab === 'documents' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadDocument(e.target.files[0]); e.target.value = ''; }}
            />

            {docs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No documents attached</p>
                <p className="text-xs mt-1">Upload invoices, photos or other files</p>
              </div>
            )}

            {docs.map(d => (
              <div key={d.id} className="bg-muted rounded-xl p-3 flex items-center justify-between gap-2">
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{d.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{d.uploaded_by} · {formatDate(d.created_at)}</p>
                </a>
                <button onClick={() => deleteDoc(d)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full gap-2" disabled={uploading}>
              <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
