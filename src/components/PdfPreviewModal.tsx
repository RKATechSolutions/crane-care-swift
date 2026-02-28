import { X, Download } from 'lucide-react';
import { useMemo } from 'react';
import type jsPDF from 'jspdf';

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  onDownload?: () => void;
}

export function PdfPreviewModal({ open, onClose, pdfDoc, onDownload }: PdfPreviewModalProps) {
  const blobUrl = useMemo(() => {
    if (!pdfDoc || !open) return null;
    return URL.createObjectURL(pdfDoc.output('blob'));
  }, [pdfDoc, open]);

  if (!open || !pdfDoc || !blobUrl) return null;

  const handleClose = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <p className="text-sm font-bold">Quote Preview</p>
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
            onClick={handleClose}
            className="tap-target flex items-center justify-center rounded-lg active:bg-muted transition-colors"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* PDF render area */}
      <div className="flex-1 overflow-auto bg-muted">
        <object
          data={blobUrl}
          type="application/pdf"
          className="w-full h-full"
        >
          {/* Fallback when PDF can't render inline */}
          <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
            <p className="text-sm text-muted-foreground">
              PDF preview is not available on this device.
            </p>
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
        </object>
      </div>
    </div>
  );
}
