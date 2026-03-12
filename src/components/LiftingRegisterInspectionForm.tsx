import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DualPhotoButton } from '@/components/DualPhotoButton';
import { CheckCircle, XCircle, AlertTriangle, Loader2, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import { compressImage } from '@/utils/uploadHelper';

interface RegisterItem {
  id: string;
  equipment_type: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  wll_value: number | null;
  wll_unit: string | null;
  equipment_status: string | null;
  tag_present: string | null;
  overall_photo_url: string | null;
  grade: string | null;
  length_m: number | null;
  sling_configuration: string | null;
  sling_leg_count: number | null;
  lift_height_m: number | null;
  span_m: number | null;
  notes: string | null;
}

interface InspectionResult {
  register_item_id: string;
  result: 'pass' | 'fail' | 'pending';
  comment: string;
  photos: string[];
}

interface LiftingRegisterInspectionFormProps {
  clientId?: string;
  siteName: string;
  clientName?: string;
  onBack: () => void;
}

export function LiftingRegisterInspectionForm({ clientId, siteName, onBack }: LiftingRegisterInspectionFormProps) {
  const { state } = useApp();
  const [items, setItems] = useState<RegisterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Record<string, InspectionResult>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<RegisterItem>>({});
  const [lastInspections, setLastInspections] = useState<Record<string, { result: string; inspection_date: string }>>({});

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      let query = supabase.from('lifting_register').select('id, equipment_type, manufacturer, model, serial_number, asset_tag, wll_value, wll_unit, equipment_status, tag_present, overall_photo_url, grade, length_m, sling_configuration, sling_leg_count, lift_height_m, span_m, notes').order('asset_tag');
      if (clientId) query = query.eq('client_id', clientId);
      else query = query.eq('site_name', siteName);

      const { data, error } = await query;
      if (error) { toast.error('Failed to load items'); setLoading(false); return; }
      const registerItems = ((data || []) as RegisterItem[]).sort((a, b) => {
        const aNum = parseInt(a.asset_tag || '', 10);
        const bNum = parseInt(b.asset_tag || '', 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.asset_tag || '').localeCompare(b.asset_tag || '', undefined, { numeric: true });
      });
      setItems(registerItems);

      const initial: Record<string, InspectionResult> = {};
      registerItems.forEach(item => {
        initial[item.id] = { register_item_id: item.id, result: 'pending', comment: '', photos: [] };
      });
      setResults(initial);

      if (registerItems.length > 0) {
        const ids = registerItems.map(i => i.id);
        const { data: inspData } = await supabase
          .from('lifting_register_inspections')
          .select('register_item_id, result, inspection_date')
          .in('register_item_id', ids)
          .order('inspection_date', { ascending: false });

        if (inspData) {
          const latest: Record<string, { result: string; inspection_date: string }> = {};
          (inspData as any[]).forEach(row => {
            if (!latest[row.register_item_id]) {
              latest[row.register_item_id] = { result: row.result, inspection_date: row.inspection_date };
            }
          });
          setLastInspections(latest);
        }
      }

      setLoading(false);
    };
    fetchItems();
  }, [clientId, siteName]);

  const updateResult = (itemId: string, result: 'pass' | 'fail') => {
    setResults(prev => ({ ...prev, [itemId]: { ...prev[itemId], result } }));
    if (result === 'fail') setExpandedId(itemId);
  };

  const updateComment = (itemId: string, comment: string) => {
    setResults(prev => ({ ...prev, [itemId]: { ...prev[itemId], comment } }));
  };

  const handlePhoto = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const compressedBlob = await compressImage(file);
        const reader = new FileReader();
        reader.onload = () => {
          setResults(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], photos: [...prev[itemId].photos, reader.result as string] },
          }));
        };
        reader.readAsDataURL(compressedBlob);
      } catch (err) {
        console.error('Photo compression failed:', err);
      }
    }
  };

  const removePhoto = (itemId: string, idx: number) => {
    setResults(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], photos: prev[itemId].photos.filter((_, i) => i !== idx) },
    }));
  };

  const startEdit = (item: RegisterItem) => {
    setEditingId(item.id);
    setEditDraft({ ...item });
    setExpandedId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (itemId: string) => {
    const { error } = await supabase.from('lifting_register').update({
      equipment_type: editDraft.equipment_type,
      serial_number: editDraft.serial_number || null,
      asset_tag: editDraft.asset_tag || null,
      manufacturer: editDraft.manufacturer || null,
      model: editDraft.model || null,
      wll_value: editDraft.wll_value || null,
      wll_unit: editDraft.wll_unit || null,
      grade: editDraft.grade || null,
      length_m: editDraft.length_m || null,
      notes: editDraft.notes || null,
      overall_photo_url: editDraft.overall_photo_url || null,
    }).eq('id', itemId);

    if (error) { toast.error('Failed to save'); return; }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...editDraft } as RegisterItem : i));
    setEditingId(null);
    setEditDraft({});
    toast.success('Item updated');
  };

  const handleEditPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setEditDraft(prev => ({ ...prev, overall_photo_url: reader.result as string }));
      };
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  };

  const handleUpdateMainPhoto = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBlob = await compressImage(file);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const { error } = await supabase.from('lifting_register').update({ overall_photo_url: dataUrl }).eq('id', itemId);
        if (error) { toast.error('Failed to update photo'); return; }
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, overall_photo_url: dataUrl } : i));
        toast.success('Item photo updated');
      };
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  };

  const isFailedItem = (item: RegisterItem) => {
    return item.equipment_status === 'Failed' || item.equipment_status === 'Removed From Service' || item.tag_present === 'false' || lastInspections[item.id]?.result === 'fail';
  };

  const failedItems = items.filter(isFailedItem);
  const otherItems = items.filter(i => !isFailedItem(i));
  const failedAssessed = failedItems.every(item => results[item.id]?.result !== 'pending');

  const handleSubmit = async () => {
    if (!state.currentUser) return;
    for (const item of failedItems) {
      const r = results[item.id];
      if (r.result === 'pending') {
        toast.error(`"${item.equipment_type}" (${item.serial_number || item.asset_tag}) must be assessed`);
        return;
      }
    }
    for (const [id, r] of Object.entries(results)) {
      if (r.result === 'fail' && !r.comment.trim()) {
        const item = items.find(i => i.id === id);
        toast.error(`Comment required for failed item "${item?.equipment_type}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const records = Object.values(results).filter(r => r.result !== 'pending').map(r => ({
        register_item_id: r.register_item_id,
        result: r.result,
        comment: r.comment || null,
        photo_urls: r.photos.length > 0 ? r.photos : [],
        client_id: clientId || null,
        site_name: siteName,
        technician_id: state.currentUser!.id,
        technician_name: state.currentUser!.name,
      }));

      const { error } = await supabase.from('lifting_register_inspections').insert(records);
      if (error) throw error;

      for (const r of records) {
        if (r.result === 'fail') {
          await supabase.from('lifting_register').update({ equipment_status: 'Failed' }).eq('id', r.register_item_id);
        } else if (r.result === 'pass') {
          await supabase.from('lifting_register').update({ equipment_status: 'In Service' }).eq('id', r.register_item_id);
        }
      }

      toast.success(`${records.length} items inspected`);
      onBack();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save inspection');
    } finally {
      setSaving(false);
    }
  };

  const ItemCard = ({ item }: { item: RegisterItem }) => {
    const r = results[item.id];
    const isExpanded = expandedId === item.id;
    const isFailed = isFailedItem(item);
    const lastInsp = lastInspections[item.id];
    const isEditing = editingId === item.id;

    return (
      <Card className={`mx-4 my-2 overflow-hidden border ${r?.result === 'fail' ? 'border-destructive/40' : r?.result === 'pass' ? 'border-green-500/40' : ''}`}>
        <div className="p-3">
          <div className="flex gap-3">
            {item.overall_photo_url ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img src={item.overall_photo_url} alt={item.equipment_type} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-muted-foreground">No Photo</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm">{item.asset_tag || item.serial_number || item.equipment_type}</p>
                {isFailed && <Badge variant="destructive" className="text-[10px]">Must Assess</Badge>}
                <button onClick={() => isEditing ? cancelEdit() : startEdit(item)} className="ml-auto p-1 rounded hover:bg-muted">
                  <Pencil className={`w-3.5 h-3.5 ${isEditing ? 'text-primary' : 'text-muted-foreground'}`} />
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                {item.serial_number && <p>SN: {item.serial_number}</p>}
                {item.asset_tag && <p>Tag: {item.asset_tag}</p>}
                {item.wll_value && <p className="font-medium text-foreground">WLL: {item.wll_value} {item.wll_unit || 'kg'}</p>}
                {item.manufacturer && <p>{item.manufacturer}{item.model ? ` — ${item.model}` : ''}</p>}
                {item.grade && <p>Grade: {item.grade}</p>}
                {item.length_m && <p>Length: {item.length_m}m</p>}
                {item.notes && <p className="italic truncate">💬 {item.notes}</p>}
              </div>
              {lastInsp && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Last: {lastInsp.result === 'pass' ? '✅' : '❌'} {lastInsp.inspection_date}
                </p>
              )}
            </div>
          </div>

          {/* Pass/Fail buttons */}
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant={r?.result === 'pass' ? 'default' : 'outline'} className={`flex-1 gap-1 ${r?.result === 'pass' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`} onClick={() => updateResult(item.id, 'pass')}>
              <CheckCircle className="w-4 h-4" /> Pass
            </Button>
            <Button size="sm" variant={r?.result === 'fail' ? 'destructive' : 'outline'} className="flex-1 gap-1" onClick={() => updateResult(item.id, 'fail')}>
              <XCircle className="w-4 h-4" /> Fail
            </Button>
            <Button size="sm" variant="ghost" className="px-2" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded: edit form OR comment + photos */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-border space-y-3">
            {/* Edit mode */}
            {isEditing && (
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Edit Item Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Equipment Type</Label>
                    <Input value={editDraft.equipment_type || ''} onChange={e => setEditDraft(p => ({ ...p, equipment_type: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Asset Tag / Unit #</Label>
                    <Input value={editDraft.asset_tag || ''} onChange={e => setEditDraft(p => ({ ...p, asset_tag: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Serial Number</Label>
                    <Input value={editDraft.serial_number || ''} onChange={e => setEditDraft(p => ({ ...p, serial_number: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Manufacturer</Label>
                    <Input value={editDraft.manufacturer || ''} onChange={e => setEditDraft(p => ({ ...p, manufacturer: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px]">WLL</Label>
                    <Input type="number" value={editDraft.wll_value ?? ''} onChange={e => setEditDraft(p => ({ ...p, wll_value: e.target.value ? Number(e.target.value) : null }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px]">WLL Unit</Label>
                    <Input value={editDraft.wll_unit || ''} onChange={e => setEditDraft(p => ({ ...p, wll_unit: e.target.value }))} className="h-8 text-xs" placeholder="kg / t" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Grade</Label>
                    <Input value={editDraft.grade || ''} onChange={e => setEditDraft(p => ({ ...p, grade: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Length (m)</Label>
                    <Input type="number" value={editDraft.length_m ?? ''} onChange={e => setEditDraft(p => ({ ...p, length_m: e.target.value ? Number(e.target.value) : null }))} className="h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">Notes</Label>
                  <Textarea value={editDraft.notes || ''} onChange={e => setEditDraft(p => ({ ...p, notes: e.target.value }))} className="text-xs min-h-[50px]" />
                </div>
                {/* Edit item photo */}
                <div>
                  <Label className="text-[11px]">Item Photo</Label>
                  {editDraft.overall_photo_url && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border mb-1">
                      <img src={editDraft.overall_photo_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setEditDraft(p => ({ ...p, overall_photo_url: null }))} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <DualPhotoButton onCapture={handleEditPhoto} variant="small" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(item.id)} className="flex-1">Save Changes</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">Cancel</Button>
                </div>
              </div>
            )}

            {/* Update item main photo */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Update Item Photo</p>
              <DualPhotoButton onCapture={e => handleUpdateMainPhoto(item.id, e)} variant="small" />
            </div>

            {/* Inspection comment + photos */}
            <Textarea
              placeholder={r?.result === 'fail' ? 'Comment required for failed items...' : 'Optional comment...'}
              value={r?.comment || ''}
              onChange={e => updateComment(item.id, e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Defect / Evidence Photos</p>
              {r?.photos && r.photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {r.photos.map((p, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(item.id, i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <DualPhotoButton onCapture={e => handlePhoto(item.id, e)} variant="default" multiple />
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Inspect Lifting Equipment" subtitle={`${siteName} • ${items.length} items`} onBack={onBack} />

      <div className="flex-1 overflow-auto pb-24">
        {loading && (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading items...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No lifting equipment to inspect</p>
          </div>
        )}

        {!loading && failedItems.length > 0 && (
          <>
            <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
              <p className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Previously Failed — Must Re-Assess ({failedItems.length})
              </p>
            </div>
            {failedItems.map(item => <ItemCard key={item.id} item={item} />)}
          </>
        )}

        {!loading && otherItems.length > 0 && (
          <>
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                All Equipment ({otherItems.length})
              </p>
            </div>
            {otherItems.map(item => <ItemCard key={item.id} item={item} />)}
          </>
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button onClick={handleSubmit} disabled={saving || !failedAssessed} className="w-full gap-2" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit Inspection ({Object.values(results).filter(r => r.result !== 'pending').length}/{items.length})
          </Button>
          {!failedAssessed && (
            <p className="text-[10px] text-destructive text-center mt-1">All previously failed items must be re-assessed</p>
          )}
        </div>
      )}
    </div>
  );
}
