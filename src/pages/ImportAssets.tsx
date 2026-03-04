import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, Loader2, AlertCircle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportAssetsProps {
  onBack: () => void;
}

export default function ImportAssets({ onBack }: ImportAssetsProps) {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);

  const processFile = async (file: File | Blob, mode: 'replace' | 'update' = 'replace') => {
    try {
      setStatus('parsing');
      setMessage('Parsing spreadsheet...');

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Collect all assets from all sheets, preserving raw headers
      const allHeaders: string[] = [];
      const allRows: any[][] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length < 2) continue;

        // First row is headers
        const headers = rows[0].map((h: any) => String(h).trim());
        
        // If we haven't set headers yet, use these
        if (allHeaders.length === 0) {
          allHeaders.push(...headers);
        }

        // Data rows
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Skip empty rows
          const hasData = row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined);
          if (!hasData) continue;
          allRows.push(row);
        }
      }

      if (allRows.length === 0) {
        throw new Error('No data rows found in spreadsheet');
      }

      setMessage(`Parsed ${allRows.length} assets with ${allHeaders.length} columns. Importing...`);
      setStatus('uploading');

      // Send in chunks
      const chunkSize = 200;
      let totalImported = 0;
      let totalLinked = 0;

      for (let i = 0; i < allRows.length; i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize);
        setMessage(`Importing batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(allRows.length / chunkSize)}...`);

        const { data: result, error } = await supabase.functions.invoke('import-assets', {
          body: { 
            assets: chunk, 
            headers: allHeaders,
            mode: i === 0 && mode === 'replace' ? 'replace' : 'update',
          },
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        totalImported += result?.imported || 0;
        totalLinked += result?.linked || 0;
      }

      setCount(totalImported);
      setStatus('done');
      setMessage(`Imported ${totalImported} assets (${totalLinked} linked to clients)`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Import failed');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, 'replace');
  };

  const handleUpdateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, 'update');
  };

  const handleLoadBundledFile = async () => {
    try {
      setStatus('parsing');
      setMessage('Loading bundled file...');
      const response = await fetch('/data/Assets_Export_03-04-2026_1.xlsx');
      if (!response.ok) throw new Error('Could not load bundled file');
      const blob = await response.blob();
      await processFile(blob, 'update');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to load bundled file');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Import Assets" onBack={onBack} />

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        {status === 'idle' && (
          <>
            <div className="text-center space-y-2">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-bold">Import Equipment Data</p>
              <p className="text-sm text-muted-foreground">Upload an InspectAll asset export (.xlsx)</p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <label className="tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer px-8 w-full">
                <Database className="w-5 h-5" />
                Update Assets (keep existing)
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpdateFile} className="hidden" />
              </label>

              <label className="tap-target bg-muted text-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer px-8 w-full">
                <Upload className="w-5 h-5" />
                Replace All Assets
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              </label>

              <button
                onClick={handleLoadBundledFile}
                className="tap-target bg-accent text-accent-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 px-8 w-full"
              >
                <Database className="w-5 h-5" />
                Load Latest Export File
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
            <button onClick={onBack} className="tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base px-8">
              Back to Sites
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rka-red mx-auto" />
            <p className="text-base font-bold text-rka-red">{message}</p>
            <button onClick={() => setStatus('idle')} className="tap-target bg-muted rounded-xl font-bold text-base px-8">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
