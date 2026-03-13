import { X, Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type jsPDF from 'jspdf';

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  onDownload?: () => void;
  title?: string;
}

export function PdfPreviewModal({ open, onClose, pdfDoc, onDownload, title = 'Report Preview' }: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pdfDoc || !open) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    setLoading(true);
    try {
      const blob = pdfDoc.output('blob');
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (err) {
      console.error('PDF preview error:', err);
      setBlobUrl(null);
    } finally {
      setLoading(false);
    }

    return () => {
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [pdfDoc, open]);

  if (!open || !pdfDoc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <p className="text-sm font-bold">{title}</p>
        <div className="flex items-center gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="tap-target flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          <button
            onClick={onClose}
            className="tap-target flex items-center justify-center rounded-lg active:bg-muted transition-colors"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* PDF render area */}
      <div className="flex-1 overflow-hidden bg-muted">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Rendering preview…</p>
          </div>
        )}
        {!loading && !blobUrl && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm text-muted-foreground">Could not render preview.</p>
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  );
}
