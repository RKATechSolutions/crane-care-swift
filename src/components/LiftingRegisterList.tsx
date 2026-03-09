import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, Package, AlertTriangle, CheckCircle, XCircle, Loader2, FileText, Download, Upload, Pencil, Trash2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateLiftingRegisterPdf } from '@/utils/generateLiftingRegisterPdf';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface LiftingRegisterListProps {
  clientId?: string;
  siteName: string;
  clientName?: string;
  onBack: () => void;
  onAddNew: () => void;
  onInspect?: () => void;
}

interface RegisterItem {
  id: string;
  equipment_type: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  wll_value: number | null;
  wll_unit: string | null;
  length_m: number | null;
  grade: string | null;
  tag_present: string | null;
  equipment_status: string | null;
  site_name: string | null;
  notes: string | null;
  registered_by_name: string;
  created_at: string;
  sling_configuration: string | null;
  sling_leg_count: number | null;
  lift_height_m: number | null;
  span_m: number | null;
  overall_photo_url: string | null;
}

const DEFAULT_EQUIPMENT_TYPES = [
  'Chain Sling', 'Wire Rope Sling', 'Web Sling', 'Shackle', 'Hook',
  'Lever Hoist', 'Chain Block', 'Beam Clamp', 'Spreader Beam',
  'Lifting Lug', 'Eyebolt', 'Swivel', 'Unknown',
];

const DEFAULT_STATUS_OPTIONS = ['In Service', 'Defect Noted', 'Out of Service', 'Quarantined'];
const DEFAULT_WLL_UNITS = ['kg', 't'];

interface CategoryGroup {
  name: string;
  types: string[];
  fields: string[];
}

export function LiftingRegisterList({ clientId, siteName, clientName, onBack, onAddNew, onInspect }: LiftingRegisterListProps) {
  const [items, setItems] = useState<RegisterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [editItem, setEditItem] = useState<RegisterItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<RegisterItem>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoTargetIdRef = useRef<string | null>(null);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState(DEFAULT_EQUIPMENT_TYPES);
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [wllUnits, setWllUnits] = useState(DEFAULT_WLL_UNITS);
  const [editSelectedGroup, setEditSelectedGroup] = useState<string | null>(null);

  const naturalSort = (a: RegisterItem, b: RegisterItem) => {
    const aNum = parseInt(a.asset_tag || '', 10);
    const bNum = parseInt(b.asset_tag || '', 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return (a.asset_tag || '').localeCompare(b.asset_tag || '', undefined, { numeric: true });
  };

  const isTimeoutError = (error: unknown) => {
    const e = error as { code?: string; message?: string } | null;
    return e?.code === '57014' || /statement timeout/i.test(e?.message || '');
  };

  const refreshItems = async () => {
    const baseSelect = 'id,equipment_type,manufacturer,model,serial_number,asset_tag,wll_value,wll_unit,length_m,grade,tag_present,equipment_status,site_name,notes,registered_by_name,created_at,sling_configuration,sling_leg_count,lift_height_m,span_m,overall_photo_url';

    // Paginated fetch to avoid statement timeouts on large TOAST tables
    const fetchPage = async (from: number, to: number) => {
      const query = supabase.from('lifting_register').select(baseSelect);
      const filtered = clientId ? query.eq('client_id', clientId) : query.eq('site_name', siteName);
      return filtered.range(from, to);
    };

    let allItems: RegisterItem[] = [];
    let page = 0;
    const pageSize = 50;
    let lastError: { code?: string; message?: string } | null = null;

    try {
      while (true) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        let attempts = 0;
        let pageData: RegisterItem[] | null = null;

        while (attempts < 3) {
          const { data, error } = await fetchPage(from, to);
          if (!error) {
            pageData = (data as RegisterItem[]) || [];
            break;
          }
          lastError = error;
          attempts += 1;
          if (isTimeoutError(error) && attempts < 3) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempts));
            continue;
          }
          throw error;
        }

        if (!pageData) throw lastError;
        allItems = allItems.concat(pageData);
        if (pageData.length < pageSize) break; // last page
        page += 1;
      }

      setLoadError(null);
      setItems(allItems.sort(naturalSort));
    } catch (err) {
      console.error('Failed loading lifting register:', err);
      setItems([]);
      setLoadError('Unable to load the lifting register right now. Please retry.');
      toast.error('Failed to load lifting register. Please retry.');
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      await refreshItems();
      setLoading(false);
    };
    void fetch();
  }, [clientId, siteName]);

  const loadAdminConfig = async () => {
    const { data } = await supabase.from('admin_config').select('config').eq('id', 'lifting_register').maybeSingle();
    if (!data?.config) {
      return { groups: [] as CategoryGroup[], types: DEFAULT_EQUIPMENT_TYPES, statuses: DEFAULT_STATUS_OPTIONS, units: DEFAULT_WLL_UNITS };
    }

    const c = data.config as any;
    const groups = Array.isArray(c.category_groups) ? c.category_groups as CategoryGroup[] : [];
    const configTypes = Array.isArray(c.equipment_types) ? c.equipment_types as string[] : DEFAULT_EQUIPMENT_TYPES;
    const groupTypes = groups.flatMap(g => g.types || []);
    const types = Array.from(new Set([...configTypes, ...groupTypes]));
    const statuses = Array.isArray(c.equipment_statuses) && c.equipment_statuses.length > 0 ? c.equipment_statuses as string[] : DEFAULT_STATUS_OPTIONS;
    const units = Array.isArray(c.wll_units) && c.wll_units.length > 0 ? c.wll_units as string[] : DEFAULT_WLL_UNITS;

    setCategoryGroups(groups);
    setEquipmentTypes(types);
    setStatusOptions(statuses);
    setWllUnits(units);

    return { groups, types, statuses, units };
  };

  useEffect(() => {
    void loadAdminConfig();
  }, []);

  const effectiveCategoryGroups = (() => {
    if (categoryGroups.length === 0) return [] as CategoryGroup[];
    const normalize = (v: string) => v.trim().toLowerCase();
    const grouped = new Set(categoryGroups.flatMap(g => (g.types || []).map(normalize)));
    const ungrouped = equipmentTypes.filter(t => !grouped.has(normalize(t)));
    return ungrouped.length > 0
      ? [...categoryGroups, { name: 'Other', types: ungrouped, fields: [] }]
      : categoryGroups;
  })();

  const statusIcon = (status: string | null) => {
    if (status === 'In Service') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'Failed' || status === 'Out of Service') return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  };

  const statusColor = (status: string | null) => {
    if (status === 'In Service') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Failed' || status === 'Out of Service') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  // ─── Share ──────────────────────────────────────────────
  const handleShare = async () => {
    if (items.length === 0) { toast.error('No items to share'); return; }
    const lines = [`LIFTING EQUIPMENT REGISTER`, `Site: ${siteName}`, `Date: ${new Date().toLocaleDateString('en-AU')}`, `Total Items: ${items.length}`, '', `${'—'.repeat(40)}`];
    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.equipment_type}`);
      if (item.serial_number) lines.push(`   Serial: ${item.serial_number}`);
      if (item.asset_tag) lines.push(`   Tag: ${item.asset_tag}`);
      if (item.wll_value) lines.push(`   WLL: ${item.wll_value} ${item.wll_unit || 'kg'}`);
      lines.push(`   Status: ${item.equipment_status || 'Unknown'}`);
      if (item.notes) lines.push(`   Notes: ${item.notes}`);
      lines.push('');
    });
    const text = lines.join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: `Lifting Register - ${siteName}`, text }); } catch { /* cancelled */ }
    } else { await navigator.clipboard.writeText(text); toast.success('Register copied to clipboard'); }
  };

  // ─── PDF / CSV ──────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (items.length === 0) { toast.error('No items to export'); return; }
    try {
      const pdf = await generateLiftingRegisterPdf({ siteName, clientName: clientName || siteName, technicianName: 'Technician', items, categoryGroups });
      pdf.save(`${(clientName || siteName).replace(/[^a-zA-Z0-9]/g, '_')}_LiftingRegister_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
  };

  const handleDownloadCsv = () => {
    if (items.length === 0) { toast.error('No items to export'); return; }
    const headers = ['#', 'Equipment Type', 'Serial Number', 'Asset Tag', 'WLL', 'Unit', 'Manufacturer', 'Model', 'Grade', 'Length (m)', 'Status', 'Notes', 'Photo', 'Registered By', 'Date'];
    const rows = items.map((item, idx) => [
      idx + 1, item.equipment_type, item.serial_number || '', item.asset_tag || '',
      item.wll_value ?? '', item.wll_unit || '', item.manufacturer || '',
      item.model || '', item.grade || '', item.length_m ?? '',
      item.equipment_status || '', item.notes || '', item.overall_photo_url || '',
      item.registered_by_name, new Date(item.created_at).toLocaleDateString('en-AU'),
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(clientName || siteName).replace(/[^a-zA-Z0-9]/g, '_')}_LiftingRegister_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  // ─── Import ─────────────────────────────────────────────
  const headerMap: Record<string, string> = {
    // Unit/Number columns → equipment_type (or skip if just row numbers)
    'unit #': 'asset_tag', 'unit#': 'asset_tag', 'unit no': 'asset_tag',
    'unit no.': 'asset_tag', 'unit number': 'asset_tag', 'no.': 'asset_tag',
    'no': 'asset_tag', '#': 'asset_tag', 'item #': 'asset_tag', 'item no': 'asset_tag',
    // Equipment type
    'equipment type': 'equipment_type', 'type': 'equipment_type', 'item': 'equipment_type',
    'item type': 'equipment_type', 'description': 'equipment_type', 'equipment': 'equipment_type',
    // Manufacturer
    'manufacturer': 'manufacturer', 'make': 'manufacturer', 'brand': 'manufacturer',
    'model': 'model',
    // Serial number
    'serial number': 'serial_number', 'serial': 'serial_number', 'sn': 'serial_number',
    'serial no': 'serial_number', 'serial no.': 'serial_number', 'serialnumber': 'serial_number',
    // Asset tag
    'asset tag': 'asset_tag', 'tag': 'asset_tag', 'asset id': 'asset_tag',
    'tag number': 'asset_tag', 'tag no': 'asset_tag', 'tag no.': 'asset_tag', 'id': 'asset_tag',
    // WLL
    'wll': 'wll_value', 'swl': 'wll_value', 'wll value': 'wll_value', 'capacity': 'wll_value',
    'wll unit': 'wll_unit', 'unit': 'wll_unit',
    // Dimensions
    'length': 'length_m', 'length (m)': 'length_m', 'length_m': 'length_m',
    'grade': 'grade',
    // Status
    'status': 'equipment_status', 'equipment status': 'equipment_status', 'condition': 'equipment_status',
    // Notes/Comments
    'notes': 'notes', 'comment': 'notes', 'comments': 'notes', 'remarks': 'notes', 'remark': 'notes',
    'observation': 'notes', 'observations': 'notes',
    // Photo
    'photo': 'overall_photo_url', 'image': 'overall_photo_url', 'photo url': 'overall_photo_url',
    // Sling/hoist
    'configuration': 'sling_configuration', 'sling configuration': 'sling_configuration',
    'legs': 'sling_leg_count', 'leg count': 'sling_leg_count',
    'lift height': 'lift_height_m', 'lift height (m)': 'lift_height_m',
    'span': 'span_m', 'span (m)': 'span_m',
  };

  const parseRowsToInsert = (headers: string[], dataRows: any[][]) => {
    // Try matching each header - also try substring matching for flexibility
    const colMap = headers.map(h => {
      const key = h.toLowerCase().trim();
      if (headerMap[key]) return headerMap[key];
      // Try without trailing periods/special chars
      const cleaned = key.replace(/[.#]/g, '').trim();
      if (headerMap[cleaned]) return headerMap[cleaned];
      // Try partial match
      for (const [mapKey, mapVal] of Object.entries(headerMap)) {
        if (key.includes(mapKey) || mapKey.includes(key)) return mapVal;
      }
      return null;
    });
    console.log('CSV headers:', headers);
    console.log('Mapped to:', colMap);
    const techName = localStorage.getItem('technicianName') || 'Import';
    const techId = localStorage.getItem('technicianId') || 'import';
    return dataRows.filter(vals => vals.some(v => v != null && String(v).trim())).map(vals => {
      const row: any = { registered_by_name: techName, registered_by_id: techId, site_name: siteName, client_id: clientId || null };
      colMap.forEach((field, idx) => {
        if (!field || vals[idx] == null || String(vals[idx]).trim() === '') return;
        const val = String(vals[idx]).trim();
        if (['wll_value', 'length_m', 'lift_height_m', 'span_m'].includes(field)) row[field] = parseFloat(val) || null;
        else if (field === 'sling_leg_count') row[field] = parseInt(val) || null;
        else row[field] = val;
      });
      if (!row.equipment_type) row.equipment_type = 'Unknown';
      return row;
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: true });
      let bestSheet: any[][] = [];
      let bestSheetName = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        const nonEmpty = data.filter(row => row.some(cell => cell != null && String(cell).trim() !== ''));
        if (nonEmpty.length > bestSheet.length) { bestSheet = nonEmpty; bestSheetName = sheetName; }
      }
      console.log(`Using sheet "${bestSheetName}" with ${bestSheet.length} rows`);
      console.log('Raw first row:', JSON.stringify(bestSheet[0]));
      if (bestSheet.length < 2) { toast.error('No sheet found with header and data'); setImporting(false); return; }
      
      // Find the actual header row - scan up to 20 rows for the real headers
      // The XLSX may have title/metadata rows before the actual data headers
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(20, bestSheet.length - 1); i++) {
        const row = bestSheet[i].map((h: any) => String(h || '').toLowerCase().trim());
        // Look for rows containing known header keywords
        const hasSerial = row.some((h: string) => h.includes('serial'));
        const hasUnit = row.some((h: string) => h.includes('unit'));
        const hasComment = row.some((h: string) => h.includes('comment') || h.includes('notes') || h.includes('remark'));
        const hasType = row.some((h: string) => h.includes('type') || h.includes('equipment'));
        const hasTag = row.some((h: string) => h.includes('tag') || h.includes('asset'));
        const hasWll = row.some((h: string) => h.includes('wll') || h.includes('swl') || h.includes('capacity'));
        
        const matchScore = [hasSerial, hasUnit, hasComment, hasType, hasTag, hasWll].filter(Boolean).length;
        if (matchScore >= 2) { headerRowIdx = i; break; }
      }
      
      // Fallback: use first row
      if (headerRowIdx === -1) headerRowIdx = 0;
      
      console.log(`Header row index: ${headerRowIdx}, headers:`, bestSheet[headerRowIdx]);
      const headers = bestSheet[headerRowIdx].map((h: any) => String(h || ''));
      const dataRows = bestSheet.slice(headerRowIdx + 1);
      
      // Filter out rows that look like metadata/sub-headers (e.g. contain "FolderID", address info, etc.)
      const filteredDataRows = dataRows.filter(row => {
        const firstCell = String(row[0] || '').toLowerCase().trim();
        // Skip rows that are clearly metadata
        if (firstCell.includes('folderid') || firstCell.includes('formid')) return false;
        if (firstCell.includes('address') || firstCell.includes('prestons')) return false;
        if (firstCell.includes('general') || firstCell === 'comment') return false;
        return true;
      });
      
      const rows = parseRowsToInsert(headers, filteredDataRows);
      console.log('Parsed rows sample:', JSON.stringify(rows.slice(0, 3)));
      if (rows.length === 0) { toast.error('No valid rows found'); setImporting(false); return; }
      const { data: insertedData, error } = await supabase.from('lifting_register').insert(rows).select('id, equipment_type, notes, serial_number, manufacturer, model, wll_value, wll_unit, grade, length_m, sling_configuration');
      if (error) { console.error('Import error:', error); toast.error('Import failed: ' + error.message); }
      else {
        toast.success(`Imported ${rows.length} items`);
        
        // AI categorize items that have Unknown equipment_type
        const unknownItems = (insertedData || []).filter((item: any) => item.equipment_type === 'Unknown');
        if (unknownItems.length > 0) {
          toast.info(`Categorizing ${unknownItems.length} items with AI...`);
          try {
            const { data: catResult, error: catError } = await supabase.functions.invoke('categorize-lifting-equipment', {
              body: { items: unknownItems },
            });
            if (catError) throw catError;
            if (catResult?.categories && Array.isArray(catResult.categories)) {
              let updated = 0;
              for (let i = 0; i < unknownItems.length; i++) {
                const newType = catResult.categories[i];
                if (newType && newType !== 'Unknown') {
                  await supabase.from('lifting_register').update({ equipment_type: newType }).eq('id', unknownItems[i].id);
                  updated++;
                }
              }
              if (updated > 0) toast.success(`AI categorized ${updated} items`);
            }
          } catch (catErr) {
            console.error('AI categorize error:', catErr);
            toast.warning('AI categorization failed — items left as Unknown');
          }
        }
        
        await refreshItems();
      }
    } catch (err) { console.error('File parse error:', err); toast.error('Failed to parse file'); }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Photo Upload ───────────────────────────────────────
  const triggerPhotoUpload = (itemId: string) => {
    photoTargetIdRef.current = itemId;
    photoInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = photoTargetIdRef.current;
    if (!file || !targetId) return;
    setUploadingPhotoId(targetId);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `lifting-register/${targetId}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('job-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('job-documents').getPublicUrl(filePath);
      const photoUrl = urlData.publicUrl;
      const { error: updateError } = await supabase.from('lifting_register').update({ overall_photo_url: photoUrl }).eq('id', targetId);
      if (updateError) throw updateError;
      setItems(prev => prev.map(i => i.id === targetId ? { ...i, overall_photo_url: photoUrl } : i));
      if (editItem?.id === targetId) setEditForm(f => ({ ...f, overall_photo_url: photoUrl }));
      toast.success('Photo uploaded');
    } catch (err) { console.error('Photo upload error:', err); toast.error('Failed to upload photo'); }
    setUploadingPhotoId(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleDeletePhoto = async (itemId: string) => {
    const { error } = await supabase.from('lifting_register').update({ overall_photo_url: null }).eq('id', itemId);
    if (error) { toast.error('Failed to remove photo'); return; }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, overall_photo_url: null } : i));
    if (editItem?.id === itemId) setEditForm(f => ({ ...f, overall_photo_url: null }));
    toast.success('Photo removed');
  };

  // ─── Edit ───────────────────────────────────────────────
  const openEdit = async (item: RegisterItem) => {
    const { groups, types } = await loadAdminConfig();
    const normalize = (v: string) => v.trim().toLowerCase();
    const typeKey = normalize(item.equipment_type);

    const matchedGroup = groups.find(g => (g.types || []).some(t => {
      const tKey = normalize(t);
      return tKey === typeKey || typeKey.includes(tKey) || tKey.includes(typeKey);
    }));

    const groupedTypeKeys = new Set(groups.flatMap(g => (g.types || []).map(normalize)));
    const hasUngrouped = types.some(t => !groupedTypeKeys.has(normalize(t)));

    setEditItem(item);
    setEditForm({ ...item });
    setEditSelectedGroup(matchedGroup?.name || (hasUngrouped ? 'Other' : null));
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const { error } = await supabase.from('lifting_register').update({
      equipment_type: editForm.equipment_type || editItem.equipment_type,
      manufacturer: editForm.manufacturer || null, model: editForm.model || null,
      serial_number: editForm.serial_number || null, asset_tag: editForm.asset_tag || null,
      wll_value: editForm.wll_value ?? null, wll_unit: editForm.wll_unit || null,
      length_m: editForm.length_m ?? null, grade: editForm.grade || null,
      equipment_status: editForm.equipment_status || null, notes: editForm.notes || null,
    }).eq('id', editItem.id);
    if (error) { toast.error('Failed to save'); console.error(error); }
    else { toast.success('Item updated'); await refreshItems(); setEditItem(null); }
    setSaving(false);
  };

  // ─── Delete ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('lifting_register').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); console.error(error); }
    else { toast.success('Item deleted'); setItems(prev => prev.filter(i => i.id !== id)); }
    setDeleteConfirm(null);
  };

  // Sequential numbering across all items
  let globalIndex = 0;

  // Group by category group (not equipment type)
  const grouped = items.reduce((acc, item) => {
    let groupName = 'Other';
    if (categoryGroups.length > 0) {
      // Exact match first
      let match = categoryGroups.find(g => g.types.includes(item.equipment_type));
      // Fuzzy fallback: match if item type contains a group type word or vice versa
      if (!match) {
        const itemLower = item.equipment_type.toLowerCase();
        match = categoryGroups.find(g =>
          g.types.some(t => {
            const tLower = t.toLowerCase();
            return itemLower.includes(tLower) || tLower.includes(itemLower);
          }) ||
          g.name.toLowerCase().includes(itemLower) ||
          itemLower.includes(g.name.toLowerCase().split(' ')[0])
        );
      }
      if (match) groupName = match.name;
    } else {
      groupName = item.equipment_type;
    }
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, RegisterItem[]>);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Lifting Equipment Register" subtitle={`${siteName} • ${items.length} items`} onBack={onBack} />

      <div className="px-4 py-2 border-b border-border space-y-2">
        <div className="flex gap-2">
          <Button onClick={handleShare} variant="outline" className="flex-1 gap-1 text-xs">
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
          <Button onClick={handleDownloadPdf} variant="outline" className="flex-1 gap-1 text-xs">
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button onClick={handleDownloadCsv} variant="outline" className="flex-1 gap-1 text-xs">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button variant="outline" className="flex-1 gap-1 text-xs" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
        </div>
        <div className="flex gap-2">
          {onInspect && (
            <Button onClick={onInspect} variant="secondary" className="flex-1 gap-2">
              <CheckCircle className="w-4 h-4" /> Inspect All
            </Button>
          )}
          <Button onClick={onAddNew} className="flex-1 gap-2">+ Add Item</Button>
        </div>
      </div>

      {/* Hidden photo input */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading register...
          </div>
        )}

        {!loading && loadError && (
          <div className="p-8 text-center text-muted-foreground space-y-3">
            <AlertTriangle className="w-10 h-10 mx-auto opacity-50" />
            <p className="font-medium">Couldn’t load lifting equipment</p>
            <p className="text-sm">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void refreshItems()}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !loadError && items.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No lifting equipment registered</p>
            <p className="text-sm mt-1">Tap "Add Item" or "Import" to add equipment</p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([type, typeItems]) => (
          <div key={type}>
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> {type} ({typeItems.length})
              </p>
            </div>
            {typeItems.map(item => {
              globalIndex++;
              return (
                <Card key={item.id} className="mx-4 my-2 p-3 border">
                  <div className="flex items-start gap-3">
                    {/* Sequential Number */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {globalIndex}
                    </div>

                    {/* Photo thumbnail */}
                    <div className="flex-shrink-0">
                      {item.overall_photo_url ? (
                        <div className="relative group">
                          <img src={item.overall_photo_url} alt={item.equipment_type} className="w-14 h-14 rounded-md object-cover border border-border" />
                          <button
                            onClick={() => triggerPhotoUpload(item.id)}
                            className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <Camera className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(item.id); }}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerPhotoUpload(item.id)}
                          disabled={uploadingPhotoId === item.id}
                          className="w-14 h-14 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                        >
                          {uploadingPhotoId === item.id
                            ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            : <Camera className="w-5 h-5 text-muted-foreground/50" />
                          }
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{item.asset_tag || item.serial_number || item.equipment_type}</p>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(item.equipment_status)}`}>
                          {item.equipment_status || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {item.equipment_type !== 'Unknown' && <p className="text-muted-foreground">{item.equipment_type}</p>}
                        {item.serial_number && <p><span className="font-medium text-foreground">SN:</span> {item.serial_number}</p>}
                        {item.asset_tag && item.serial_number && <p>Tag: {item.asset_tag}</p>}
                        {item.wll_value && (
                          <p className="font-medium text-foreground">WLL: {item.wll_value} {item.wll_unit || 'kg'}</p>
                        )}
                        {item.manufacturer && <p>{item.manufacturer}{item.model ? ` — ${item.model}` : ''}</p>}
                        {item.grade && <p>Grade: {item.grade}</p>}
                        {item.length_m && <p>Length: {item.length_m}m</p>}
                        {item.notes && <p className="italic text-muted-foreground">💬 {item.notes}</p>}
                      </div>
                      {item.tag_present === 'false' && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] text-amber-600 font-medium">Tag Missing</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      {statusIcon(item.equipment_status)}
                      <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted" title="Edit">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-1 rounded hover:bg-destructive/10" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 pl-10">
                    Registered by {item.registered_by_name} • {new Date(item.created_at).toLocaleDateString('en-AU')}
                  </p>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {effectiveCategoryGroups.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs">Equipment Group</Label>
                <div className="flex flex-wrap gap-1.5">
                  {effectiveCategoryGroups.map(g => (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setEditSelectedGroup(editSelectedGroup === g.name ? null : g.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        editSelectedGroup === g.name
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
                {editSelectedGroup && (() => {
                  const group = effectiveCategoryGroups.find(g => g.name === editSelectedGroup);
                  const types = group?.types || [];
                  return types.length > 0 ? (
                    <div>
                      <Label className="text-xs">Equipment Type</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {types.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditForm(f => ({ ...f, equipment_type: f.equipment_type === t ? '' : t }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              editForm.equipment_type === t
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-border hover:border-primary/50'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div>
                <Label className="text-xs">Equipment Type</Label>
                <Select value={editForm.equipment_type || ''} onValueChange={v => setEditForm(f => ({ ...f, equipment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{equipmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Manufacturer</Label><Input value={editForm.manufacturer || ''} onChange={e => setEditForm(f => ({ ...f, manufacturer: e.target.value }))} /></div>
              <div><Label className="text-xs">Model</Label><Input value={editForm.model || ''} onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Serial Number</Label><Input value={editForm.serial_number || ''} onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
              <div><Label className="text-xs">Asset Tag</Label><Input value={editForm.asset_tag || ''} onChange={e => setEditForm(f => ({ ...f, asset_tag: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">WLL</Label><Input type="number" value={editForm.wll_value ?? ''} onChange={e => setEditForm(f => ({ ...f, wll_value: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select value={editForm.wll_unit || 'kg'} onValueChange={v => setEditForm(f => ({ ...f, wll_unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{wllUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Grade</Label><Input value={editForm.grade || ''} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Length (m)</Label><Input type="number" value={editForm.length_m ?? ''} onChange={e => setEditForm(f => ({ ...f, length_m: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={editForm.equipment_status || 'In Service'} onValueChange={v => setEditForm(f => ({ ...f, equipment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Notes / Comments</Label><Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            {/* Photo in edit dialog */}
            <div>
              <Label className="text-xs">Photo</Label>
              {editForm.overall_photo_url ? (
                <div className="relative mt-1 w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={editForm.overall_photo_url} alt="Equipment" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <button
                      onClick={() => editItem && triggerPhotoUpload(editItem.id)}
                      className="bg-background/80 backdrop-blur rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1 border border-border"
                    >
                      <Camera className="w-3 h-3" /> Replace
                    </button>
                    <button
                      onClick={() => editItem && handleDeletePhoto(editItem.id)}
                      className="bg-destructive text-destructive-foreground rounded-md px-2 py-1 text-xs font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => editItem && triggerPhotoUpload(editItem.id)}
                  disabled={uploadingPhotoId === editItem?.id}
                  className="mt-1 w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-xs">{uploadingPhotoId === editItem?.id ? 'Uploading…' : 'Add Photo'}</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
