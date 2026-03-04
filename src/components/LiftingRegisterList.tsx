import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Package, AlertTriangle, CheckCircle, XCircle, Loader2, FileText, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { generateLiftingRegisterPdf } from '@/utils/generateLiftingRegisterPdf';
import { format } from 'date-fns';

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
}

export function LiftingRegisterList({ clientId, siteName, clientName, onBack, onAddNew, onInspect }: LiftingRegisterListProps) {
  const [items, setItems] = useState<RegisterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      let query = supabase
        .from('lifting_register')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('site_name', siteName);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching register:', error);
        toast.error('Failed to load register');
      }
      setItems((data as RegisterItem[]) || []);
      setLoading(false);
    };
    fetchItems();
  }, [clientId, siteName]);

  const statusIcon = (status: string | null) => {
    if (status === 'In Service') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'Failed') return <XCircle className="w-4 h-4 text-destructive" />;
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  };

  const statusColor = (status: string | null) => {
    if (status === 'In Service') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Failed') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const handleShare = async () => {
    if (items.length === 0) {
      toast.error('No items to share');
      return;
    }

    // Build a text summary for sharing
    const lines = [
      `LIFTING EQUIPMENT REGISTER`,
      `Site: ${siteName}`,
      `Date: ${new Date().toLocaleDateString('en-AU')}`,
      `Total Items: ${items.length}`,
      ``,
      `${'—'.repeat(40)}`,
    ];

    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.equipment_type}`);
      if (item.serial_number) lines.push(`   Serial: ${item.serial_number}`);
      if (item.asset_tag) lines.push(`   Tag: ${item.asset_tag}`);
      if (item.wll_value) lines.push(`   WLL: ${item.wll_value} ${item.wll_unit || 'kg'}`);
      if (item.manufacturer) lines.push(`   Manufacturer: ${item.manufacturer}`);
      if (item.model) lines.push(`   Model: ${item.model}`);
      if (item.grade) lines.push(`   Grade: ${item.grade}`);
      if (item.length_m) lines.push(`   Length: ${item.length_m}m`);
      lines.push(`   Status: ${item.equipment_status || 'Unknown'}`);
      if (item.tag_present === 'false') lines.push(`   ⚠️ Tag Missing`);
      lines.push('');
    });

    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `Lifting Register - ${siteName}`, text });
        toast.success('Shared successfully');
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Register copied to clipboard');
    }
  };

  const handleDownloadPdf = async () => {
    if (items.length === 0) { toast.error('No items to export'); return; }
    try {
      const pdf = await generateLiftingRegisterPdf({ siteName, clientName: clientName || siteName, technicianName: 'Technician', items });
      const safeName = (clientName || siteName).replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = format(new Date(), 'yyyyMMdd');
      pdf.save(`${safeName}_LiftingRegister_${dateStr}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
  };

  const handleDownloadCsv = () => {
    if (items.length === 0) { toast.error('No items to export'); return; }
    const headers = ['Equipment Type', 'Serial Number', 'Asset Tag', 'WLL', 'Unit', 'Manufacturer', 'Model', 'Grade', 'Length (m)', 'Status', 'Tag Present', 'Registered By', 'Date'];
    const rows = items.map(item => [
      item.equipment_type,
      item.serial_number || '',
      item.asset_tag || '',
      item.wll_value ?? '',
      item.wll_unit || '',
      item.manufacturer || '',
      item.model || '',
      item.grade || '',
      item.length_m ?? '',
      item.equipment_status || '',
      item.tag_present || '',
      item.registered_by_name,
      new Date(item.created_at).toLocaleDateString('en-AU'),
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (clientName || siteName).replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${safeName}_LiftingRegister_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); setImporting(false); return; }

        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

        // Map common header names to DB fields
        const headerMap: Record<string, string> = {
          'equipment type': 'equipment_type', 'type': 'equipment_type',
          'manufacturer': 'manufacturer', 'make': 'manufacturer', 'brand': 'manufacturer',
          'model': 'model',
          'serial number': 'serial_number', 'serial': 'serial_number', 'sn': 'serial_number',
          'asset tag': 'asset_tag', 'tag': 'asset_tag', 'id': 'asset_tag', 'asset id': 'asset_tag',
          'wll': 'wll_value', 'swl': 'wll_value', 'wll value': 'wll_value',
          'wll unit': 'wll_unit', 'unit': 'wll_unit',
          'length': 'length_m', 'length (m)': 'length_m', 'length_m': 'length_m',
          'grade': 'grade',
          'status': 'equipment_status', 'equipment status': 'equipment_status',
          'notes': 'notes', 'comment': 'notes',
          'configuration': 'sling_configuration', 'sling configuration': 'sling_configuration',
          'legs': 'sling_leg_count', 'leg count': 'sling_leg_count',
          'lift height': 'lift_height_m', 'lift height (m)': 'lift_height_m',
          'span': 'span_m', 'span (m)': 'span_m',
        };

        const colMap = headers.map(h => headerMap[h] || null);

        const techName = localStorage.getItem('technicianName') || 'Import';
        const techId = localStorage.getItem('technicianId') || 'import';

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          // Parse CSV row respecting quoted commas
          const vals = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || lines[i].split(',').map(v => v.trim());
          
          const row: any = {
            registered_by_name: techName,
            registered_by_id: techId,
            site_name: siteName,
            client_id: clientId || null,
          };

          colMap.forEach((field, idx) => {
            if (!field || !vals[idx]) return;
            const val = vals[idx];
            if (['wll_value', 'length_m', 'lift_height_m', 'span_m'].includes(field)) {
              row[field] = parseFloat(val) || null;
            } else if (field === 'sling_leg_count') {
              row[field] = parseInt(val) || null;
            } else {
              row[field] = val;
            }
          });

          if (!row.equipment_type) {
            row.equipment_type = 'Unknown';
          }

          rows.push(row);
        }

        if (rows.length === 0) { toast.error('No valid rows found'); setImporting(false); return; }

        const { error } = await supabase.from('lifting_register').insert(rows);
        if (error) {
          console.error('Import error:', error);
          toast.error('Import failed: ' + error.message);
        } else {
          toast.success(`Imported ${rows.length} items`);
          // Refresh list
          let query = supabase.from('lifting_register').select('*').order('created_at', { ascending: false });
          if (clientId) query = query.eq('client_id', clientId);
          else query = query.eq('site_name', siteName);
          const { data } = await query;
          setItems((data as RegisterItem[]) || []);
        }
      } catch (err) {
        console.error('CSV parse error:', err);
        toast.error('Failed to parse CSV');
      }
      setImporting(false);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Group by equipment type
  const grouped = items.reduce((acc, item) => {
    const key = item.equipment_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, RegisterItem[]>);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Lifting Equipment Register"
        subtitle={`${siteName} • ${items.length} items`}
        onBack={onBack}
      />

      <div className="px-4 py-2 border-b border-border space-y-2">
        <div className="flex gap-2">
          <Button onClick={handleShare} variant="outline" className="flex-1 gap-1 text-xs">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
          <Button onClick={handleDownloadPdf} variant="outline" className="flex-1 gap-1 text-xs">
            <FileText className="w-3.5 h-3.5" />
            PDF
          </Button>
          <Button onClick={handleDownloadCsv} variant="outline" className="flex-1 gap-1 text-xs">
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1 text-xs"
            disabled={importing}
            onClick={() => document.getElementById('csv-import-input')?.click()}
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? 'Importing...' : 'Import'}
          </Button>
          <input
            id="csv-import-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCsv}
          />
        </div>
        <div className="flex gap-2">
          {onInspect && (
            <Button onClick={onInspect} variant="secondary" className="flex-1 gap-2">
              <CheckCircle className="w-4 h-4" />
              Inspect All
            </Button>
          )}
          <Button onClick={onAddNew} className="flex-1 gap-2">
            + Add Item
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading register...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No lifting equipment registered</p>
            <p className="text-sm mt-1">Tap "Add Item" to register lifting equipment</p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([type, typeItems]) => (
          <div key={type}>
            <div className="px-4 py-2 bg-muted/50 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {type} ({typeItems.length})
              </p>
            </div>
            {typeItems.map(item => (
              <Card key={item.id} className="mx-4 my-2 p-3 border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{item.equipment_type}</p>
                      <Badge variant="outline" className={`text-[10px] ${statusColor(item.equipment_status)}`}>
                        {item.equipment_status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {item.serial_number && <p>SN: {item.serial_number}</p>}
                      {item.asset_tag && <p>Tag: {item.asset_tag}</p>}
                      {item.wll_value && (
                        <p className="font-medium text-foreground">
                          WLL: {item.wll_value} {item.wll_unit || 'kg'}
                        </p>
                      )}
                      {item.manufacturer && <p>{item.manufacturer}{item.model ? ` — ${item.model}` : ''}</p>}
                      {item.grade && <p>Grade: {item.grade}</p>}
                      {item.length_m && <p>Length: {item.length_m}m</p>}
                      {item.sling_configuration && <p>Config: {item.sling_configuration}</p>}
                      {item.sling_leg_count && <p>Legs: {item.sling_leg_count}</p>}
                      {item.lift_height_m && <p>Lift Height: {item.lift_height_m}m</p>}
                      {item.span_m && <p>Span: {item.span_m}m</p>}
                    </div>
                    {item.tag_present === 'false' && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-amber-600 font-medium">Tag Missing</span>
                      </div>
                    )}
                  </div>
                  {statusIcon(item.equipment_status)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Registered by {item.registered_by_name} • {new Date(item.created_at).toLocaleDateString('en-AU')}
                </p>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
