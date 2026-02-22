import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, Loader2, AlertCircle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportAssetsProps {
  onBack: () => void;
}

// Parse the master XLSX format with asset sheets
// Columns: 0:source_sheet, 1:id, 2:accountId, 3:accountName, 4:inspectall_customer_id,
// 5:match_status, 6:matched_client_name, 7:className, 8:id1, 9:id2, 10:status,
// 11:accountNum, 12:locationId, 13:locationName, 14:locationNum, 15:areaName,
// 16:description, 17:urgentNote, 18:latitude, 19:longitude, 20:createdAt, 21:createdById,
// 22:Configuration, 23:Grade&Size, 24:Length, 25:Manufacturer, 26:Type, 27:Capacity,
// 28:ModelNumber, 29:Length/Lift, 30:HookType, 31:SerialNumber, 32:Power, 33:Pendant/Remote,
// 34:CraneMfg, 35:HoistConfig, 36:TrolleyConfig, 37-40:Hoist1, 41-44:Hoist2,
// 49:ControlType, 50:PendantBrand, 51:TrolleySerial
function parseMasterAssets(workbook: XLSX.WorkBook): any[] {
  const assets: any[] = [];
  const seenIds = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 3) continue;

    // Check if this is an asset sheet by looking at header row
    const header0 = String(rows[0]?.[0] || '').toLowerCase();
    // Skip client sheets (first col is "Client Name" or similar)
    if (header0.includes('client') && !header0.includes('chain') && !header0.includes('crane')) continue;

    // Find the header row - look for 'classname' or 'className' in row
    let headerRow = -1;
    for (let h = 0; h < Math.min(3, rows.length); h++) {
      const rowStr = rows[h]?.map(c => String(c).toLowerCase()).join('|') || '';
      if (rowStr.includes('classname') || rowStr.includes('accountname')) {
        headerRow = h;
        break;
      }
    }
    if (headerRow === -1) continue;

    for (let i = headerRow + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 8) continue;

      const className = String(r[7] || '').trim();
      if (!className || className === 'classname') continue;

      const externalId = String(r[1] || '').trim();
      if (!externalId) continue;

      const key = externalId;
      if (seenIds.has(key)) continue;
      seenIds.add(key);

      const clientName = String(r[3] || r[6] || '').trim();

      assets.push({
        externalId,
        className,
        assetId1: String(r[8] || '').trim() || null,
        assetId2: String(r[9] || '').trim() || null,
        status: String(r[10] || 'In Service').trim(),
        accountNum: String(r[11] || '').trim() || null,
        clientName: clientName || null,
        matchedClientId: String(r[4] || '').trim() || null,
        locationId: String(r[12] || '').trim() || null,
        locationName: String(r[13] || '').trim() || null,
        locationNum: String(r[14] || '').trim() || null,
        areaName: String(r[15] || '').trim() || null,
        description: String(r[16] || '').trim() || null,
        urgentNote: String(r[17] || '').trim() || null,
        latitude: r[18] || null,
        longitude: r[19] || null,
        createdAt: String(r[20] || '').trim() || null,
        createdById: String(r[21] || '').trim() || null,
        configuration: String(r[22] || '').trim() || null,
        gradeSize: String(r[23] || '').trim() || null,
        lengthLift: String(r[24] || r[29] || '').trim() || null,
        manufacturer: String(r[25] || '').trim() || null,
        assetType: String(r[26] || '').trim() || null,
        capacity: String(r[27] || '').trim() || null,
        modelNumber: String(r[28] || '').trim() || null,
        hookType: String(r[30] || '').trim() || null,
        serialNumber: String(r[31] || '').trim() || null,
        power: String(r[32] || '').trim() || null,
        pendantRemote: String(r[33] || '').trim() || null,
        craneManufacturer: String(r[34] || '').trim() || null,
        hoistConfig: String(r[35] || '').trim() || null,
        trolleyConfig: String(r[36] || '').trim() || null,
        liftMedHoist1: String(r[37] || '').trim() || null,
        mfgHoist1: String(r[38] || '').trim() || null,
        modelHoist1: String(r[39] || '').trim() || null,
        serialHoist1: String(r[40] || '').trim() || null,
        liftMedHoist2: String(r[41] || '').trim() || null,
        mfgHoist2: String(r[42] || '').trim() || null,
        modelHoist2: String(r[43] || '').trim() || null,
        serialHoist2: String(r[44] || '').trim() || null,
        controlType: String(r[49] || '').trim() || null,
        pendantBrand: String(r[50] || '').trim() || null,
        trolleySerial: String(r[51] || '').trim() || null,
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
    await processMasterFile(file);
  };

  const processMasterFile = async (file: File | Blob) => {
    try {
      setStatus('parsing');
      setMessage('Parsing master spreadsheet...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      const assets = parseMasterAssets(workbook);

      if (assets.length === 0) {
        throw new Error('No assets found in file. Check the format.');
      }

      setMessage(`Parsed ${assets.length} unique assets. Importing in batches...`);
      setStatus('uploading');

      // Send in chunks of 200 to avoid payload limits
      const chunkSize = 200;
      let totalImported = 0;
      let totalLinked = 0;
      let totalSkipped = 0;

      for (let i = 0; i < assets.length; i += chunkSize) {
        const chunk = assets.slice(i, i + chunkSize);
        setMessage(`Importing batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(assets.length / chunkSize)} (${chunk.length} assets)...`);

        const { data: result, error } = await supabase.functions.invoke('import-master-assets', {
          body: { assets: chunk },
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        totalImported += result?.imported || 0;
        totalLinked += result?.linked || 0;
        totalSkipped += result?.skipped || 0;
      }

      setCount(totalImported);
      setStatus('done');
      setMessage(`Imported ${totalImported} assets (${totalLinked} linked to clients, ${totalSkipped} skipped)`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Import failed');
    }
  };

  const handleLoadBundledFile = async () => {
    try {
      setStatus('parsing');
      setMessage('Loading bundled master file...');
      const response = await fetch('/data/Master_Assets.xlsx');
      if (!response.ok) throw new Error('Could not load bundled file');
      const blob = await response.blob();
      await processMasterFile(blob);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to load bundled file');
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

              <button
                onClick={handleLoadBundledFile}
                className="tap-target bg-accent text-accent-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 px-8 w-full"
              >
                <Database className="w-5 h-5" />
                Load Bundled Master File
              </button>
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
