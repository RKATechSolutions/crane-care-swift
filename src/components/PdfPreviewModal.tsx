import { X, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfBlobUrl: string | null;
  onDownload?: () => void;
}

export function PdfPreviewModal({ open, onClose, pdfBlobUrl, onDownload }: PdfPreviewModalProps) {
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    setIframeError(false);
  }, [pdfBlobUrl]);

  if (!open || !pdfBlobUrl) return null;

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
            onClick={onClose}
            className="tap-target flex items-center justify-center rounded-lg active:bg-muted transition-colors"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* PDF embed */}
      <div className="flex-1 overflow-hidden">
        {!iframeError ? (
          <iframe
            src={pdfBlobUrl}
            className="w-full h-full border-0"
            title="Quote PDF Preview"
            onError={() => setIframeError(true)}
          />
        ) : null}

        {/* Fallback for mobile browsers that can't render PDFs inline */}
        {iframeError && (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                PDF preview is not supported on this device.
              </p>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 mx-auto"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
