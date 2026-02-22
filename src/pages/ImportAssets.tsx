import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, Loader2, AlertCircle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportAssetsProps {
  onBack: () => void;
}

// Parse the master XLSX format with asset sheets
function parseMasterAssets(workbook: XLSX.WorkBook): any[] {
  const assets: any[] = [];
  const seenIds = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Skip sheets that look like client-only data (check first data row)
    if (rows.length < 2) continue;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 10) continue;

      // Detect asset rows: column 0 starts with a number (like "25825 Overhead Crane")
      const col0 = String(r[0] || '').trim();
      if (!col0 || col0 === 'client_name') continue;

      // Master format columns (asset sheets):
      // 0: class_label (e.g. "25825 Overhead Crane")
      // 1: aroflo_asset_id
      // 2: inspectall_customer_id
      // 3: client_name
      // 4: matched_id
      // 5: match_status
      // 6: matched_client_name
      // 7: class_name (clean)
      // 8: asset_id1 / serial
      // 9: asset_id2
      // 10: status
      // 11: barcode
      // 12: location_id
      // 13: location_name
      // 14: location_num
      // 15: area_name
      // 16: description
      // 17: lat
      // 18: lng
      // 19: created_at
      // 20: created_by_id
      // 21: grade/size/config (varies)
      // 22-23: length
      // 24: manufacturer/brand
      // 25: asset_type
      // 26: capacity
      // 27: model
      // 28: lift/length
      // 29-30: more fields
      // 31: serial_number (from hoist)
      // Then hoist details...

      const className = String(r[7] || '').trim();
      if (!className) continue;

      const externalId = String(r[1] || '').trim();
      const key = externalId || `${r[3]}-${r[8]}-${r[16]}`;
      if (seenIds.has(key)) continue;
      seenIds.add(key);

      const clientName = String(r[3] || r[6] || '').trim();

      assets.push({
        externalId: externalId || null,
        className,
        assetId1: String(r[8] || '').trim() || null,
        assetId2: String(r[9] || '').trim() || null,
        status: String(r[10] || 'In Service').trim(),
        barcode: String(r[11] || '').trim() || null,
        clientName: clientName || null,
        matchedClientId: String(r[4] || '').trim() || null,
        locationId: String(r[12] || '').trim() || null,
        locationName: String(r[13] || '').trim() || null,
        locationNum: String(r[14] || '').trim() || null,
        areaName: String(r[15] || '').trim() || null,
        description: String(r[16] || '').trim() || null,
        latitude: r[17] || null,
        longitude: r[18] || null,
        createdAt: String(r[19] || '').trim() || null,
        createdById: String(r[20] || '').trim() || null,
        // Asset details (positions vary by sheet but typically):
        manufacturer: String(r[24] || '').trim() || null,
        assetType: String(r[25] || '').trim() || null,
        capacity: String(r[26] || '').trim() || null,
        modelNumber: String(r[27] || '').trim() || null,
        lengthLift: String(r[28] || '').trim() || null,
        powerSupply: String(r[29] || '').trim() || null,
        serialNumber: String(r[31] || '').trim() || null,
        controlType: String(r[32] || '').trim() || null,
        configuration: String(r[33] || '').trim() || null,
        hoistConfig: String(r[34] || '').trim() || null,
        liftMedHoist1: String(r[36] || '').trim() || null,
        mfgHoist1: String(r[37] || '').trim() || null,
        modelHoist1: String(r[38] || '').trim() || null,
        serialHoist1: String(r[39] || '').trim() || null,
        liftMedHoist2: String(r[40] || '').trim() || null,
        mfgHoist2: String(r[41] || '').trim() || null,
        modelHoist2: String(r[42] || '').trim() || null,
        serialHoist2: String(r[43] || '').trim() || null,
        pendantRemote: String(r[44] || '').trim() || null,
        pendantBrand: String(r[45] || '').trim() || null,
      });
    }
  }

  return assets;
}

export default function ImportAssets({ onBack }: ImportAssetsProps) {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('parsing');
      setMessage('Parsing spreadsheet...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Collect all assets from all sheets
      const allAssets: any[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        for (const row of rows) {
          const r = row as any;
          if (!r.className && !r.id) continue;
          allAssets.push(r);
        }
      }

      setMessage(`Parsed ${allAssets.length} assets. Importing...`);
      setStatus('uploading');

      const { data: result, error } = await supabase.functions.invoke('import-assets', {
        body: { assets: allAssets },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      setCount(result?.imported || allAssets.length);
      setStatus('done');
      setMessage(`Successfully imported ${result?.imported || allAssets.length} assets!`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Import failed');
    }
  };

  const handleMasterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus('parsing');
      setMessage('Parsing master spreadsheet...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const assets = parseMasterAssets(workbook);

      if (assets.length === 0) {
        throw new Error('No assets found in file. Check the format.');
      }

      setMessage(`Parsed ${assets.length} unique assets. Importing...`);
      setStatus('uploading');

      const { data: result, error } = await supabase.functions.invoke('import-master-assets', {
        body: { assets },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      setCount(result?.imported || assets.length);
      setStatus('done');
      setMessage(`Imported ${result?.imported || 0} assets (${result?.linked || 0} linked to clients, ${result?.skipped || 0} skipped)`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Import failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Import Assets"
        onBack={onBack}
      />

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        {status === 'idle' && (
          <>
            <div className="text-center space-y-2">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-bold">Import Equipment Data</p>
              <p className="text-sm text-muted-foreground">Choose a format below</p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <label className="tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer px-8 w-full">
                <Database className="w-5 h-5" />
                Master Customer+Assets File
                <input type="file" accept=".xlsx,.xls" onChange={handleMasterFile} className="hidden" />
              </label>

              <label className="tap-target bg-muted text-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer px-8 w-full">
                <Upload className="w-5 h-5" />
                Standard Asset Export
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
            </div>
          </>
        )}

        {(status === 'parsing' || status === 'uploading') && (
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-base font-medium">{message}</p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-rka-green mx-auto" />
            <p className="text-lg font-bold text-rka-green">{message}</p>
            <button
              onClick={onBack}
              className="tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base px-8"
            >
              Back to Sites
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rka-red mx-auto" />
            <p className="text-base font-bold text-rka-red">{message}</p>
            <button
              onClick={() => setStatus('idle')}
              className="tap-target bg-muted rounded-xl font-bold text-base px-8"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
