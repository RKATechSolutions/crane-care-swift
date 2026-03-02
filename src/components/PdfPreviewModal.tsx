import { X, Download, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import type jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  onDownload?: () => void;
  title?: string;
}

export function PdfPreviewModal({ open, onClose, pdfDoc, onDownload, title = 'Report Preview' }: PdfPreviewModalProps) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfDoc || !open) {
      setPageImages([]);
      return;
    }

    let cancelled = false;

    async function renderPages() {
      setLoading(true);
      try {
        const arrayBuffer = pdfDoc!.output('arraybuffer');
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const scale = 2; // high-res rendering
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          images.push(canvas.toDataURL('image/png'));
        }

        if (!cancelled) setPageImages(images);
      } catch (err) {
        console.error('PDF render error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderPages();
    return () => { cancelled = true; };
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

      {/* PDF render area — rendered as images */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Rendering preview…</p>
          </div>
        )}
        {!loading && pageImages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
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
        {pageImages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Page ${i + 1}`}
            className="w-full rounded-lg shadow-md"
          />
        ))}
      </div>
    </div>
  );
}
