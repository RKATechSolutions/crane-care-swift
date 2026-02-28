import { X, Download } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import jsPDF from 'jspdf';

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  onDownload?: () => void;
}

export function PdfPreviewModal({ open, onClose, pdfDoc, onDownload }: PdfPreviewModalProps) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfDoc || !open) {
      setPageImages([]);
      return;
    }

    // Render each page as a PNG data URL
    const pages: string[] = [];
    const totalPages = pdfDoc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdfDoc.setPage(i);
      // Output as image data URL (high quality)
      const imgData = pdfDoc.output('datauristring', { filename: `page-${i}.pdf` });
      pages.push(imgData);
    }

    // Use a canvas approach: convert PDF pages to images via jsPDF internal canvas
    // jsPDF doesn't have a direct toCanvas, so we'll use the data URI of the full PDF
    // and render it in an <object> tag with PDF.js fallback
    // Simpler approach: render as single data URI in an <img> via svg foreignObject trick
    // Actually simplest reliable approach: render each page to a canvas manually
    
    // For jsPDF, the best cross-browser approach is to convert to base64 images per page
    // Since jsPDF doesn't support per-page image export natively, we'll use the 
    // full document as a single blob and try object tag, with image fallback
    setPageImages([]);
  }, [pdfDoc, open]);

  if (!open || !pdfDoc) return null;

  // Use object tag which has better PDF support than iframe
  const blobUrl = URL.createObjectURL(pdfDoc.output('blob'));

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
            onClick={() => {
              URL.revokeObjectURL(blobUrl);
              onClose();
            }}
            className="tap-target flex items-center justify-center rounded-lg active:bg-muted transition-colors"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* PDF render area */}
      <div className="flex-1 overflow-auto bg-muted" ref={containerRef}>
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
