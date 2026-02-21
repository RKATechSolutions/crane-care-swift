import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportAssets() {
  const { dispatch } = useApp();
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title="Import Assets"
        onBack={() => dispatch({ type: 'BACK_TO_SITES' })}
      />

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        {status === 'idle' && (
          <>
            <div className="text-center space-y-2">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-bold">Upload Assets Spreadsheet</p>
              <p className="text-sm text-muted-foreground">Select an .xlsx file to import equipment data</p>
            </div>
            <label className="tap-target bg-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer px-8">
              <Upload className="w-5 h-5" />
              Choose File
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            </label>
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
              onClick={() => dispatch({ type: 'BACK_TO_SITES' })}
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
