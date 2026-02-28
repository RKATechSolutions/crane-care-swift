import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import rkaHeaderUrl from '@/assets/rka-pdf-header.png';
import rkaFooterUrl from '@/assets/rka-pdf-footer.png';
import type { QuoteLineItem } from '@/pages/QuoteBuilder';

const RKA_GREEN: [number, number, number] = [96, 179, 76];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];
const WHITE: [number, number, number] = [255, 255, 255];

interface QuotePdfData {
  quoteName: string;
  quoteNumber: string;
  clientName: string;
  clientAddress: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  technicianName: string;
  date: string;
  validityDays: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  gst: number;
  total: number;
  notes: string;
  collateItems?: boolean;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function generateQuotePdf(data: QuotePdfData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 10;

  // Load images
  let headerImg: HTMLImageElement | null = null;
  let footerImg: HTMLImageElement | null = null;
  try {
    [headerImg, footerImg] = await Promise.all([
      loadImage(rkaHeaderUrl),
      loadImage(rkaFooterUrl),
    ]);
  } catch (e) {
    console.warn('Could not load PDF images');
  }

  // Header image
  if (headerImg) {
    const ratio = headerImg.width / headerImg.height;
    const imgWidth = pageWidth;
    const imgHeight = imgWidth / ratio;
    doc.addImage(headerImg, 'PNG', 0, 0, imgWidth, imgHeight);
    y = imgHeight + 5;
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('QUOTATION', margin, y);
  y += 8;

  // Quote details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const detailsLeft = [
    ['Quote Number:', data.quoteNumber],
    ['Date:', data.date],
    ['Valid For:', `${data.validityDays} days`],
    ['Prepared By:', data.technicianName],
  ];

  const detailsRight = [
    ['Client:', data.clientName],
    ['Address:', data.clientAddress || '—'],
    ['Contact:', data.contactName || '—'],
    ['Email:', data.contactEmail || '—'],
    ['Phone:', data.contactPhone || '—'],
  ];

  const colLeft = margin;
  const colRight = pageWidth / 2 + 5;

  detailsLeft.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, colLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, colLeft + 30, y);
    y += 5;
  });

  let yRight = y - (detailsLeft.length * 5);
  detailsRight.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, colRight, yRight);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '', colRight + 22, yRight);
    yRight += 5;
  });

  y = Math.max(y, yRight) + 5;

  // Divider
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Line items by category
  const categories: Array<{ key: string; label: string; items: QuoteLineItem[] }> = [
    { key: 'labour', label: 'LABOUR', items: data.lineItems.filter(i => i.category === 'labour') },
    { key: 'materials', label: 'MATERIALS', items: data.lineItems.filter(i => i.category === 'materials') },
    { key: 'expenses', label: 'EXPENSES', items: data.lineItems.filter(i => i.category === 'expenses') },
  ];

  for (const cat of categories) {
    if (cat.items.length === 0) continue;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(cat.label, margin, y);
    y += 2;

    const tableData = cat.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.sellPrice.toFixed(2)}`,
      `$${(item.quantity * item.sellPrice).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: RKA_GREEN,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: DARK,
      },
      alternateRowStyles: {
        fillColor: LIGHT_GRAY,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // Totals
  y += 3;
  const totalsX = pageWidth - margin - 60;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal (ex GST):', totalsX, y);
  doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.text('GST (10%):', totalsX, y);
  doc.text(`$${data.gst.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(...BORDER_GRAY);
  doc.line(totalsX, y - 2, pageWidth - margin, y - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RKA_GREEN);
  doc.text('TOTAL (inc GST):', totalsX, y + 3);
  doc.text(`$${data.total.toFixed(2)}`, pageWidth - margin, y + 3, { align: 'right' });
  y += 12;

  // Notes
  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text('ADDITIONAL NOTES', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 5;
  }

  // Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('TERMS & CONDITIONS', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const terms = [
    `This quote is valid for ${data.validityDays} days from the date of issue.`,
    'All prices are in Australian Dollars (AUD).',
    'Payment terms: 14 days from date of invoice.',
    'Work performed in accordance with relevant Australian Standards (AS 2550, AS 1418, AS 4991).',
  ];
  terms.forEach(t => {
    doc.text(`• ${t}`, margin, y);
    y += 4;
  });

  // Footer image
  if (footerImg) {
    const ratio = footerImg.width / footerImg.height;
    const imgWidth = pageWidth;
    const imgHeight = imgWidth / ratio;
    const footerY = doc.internal.pageSize.getHeight() - imgHeight;
    doc.addImage(footerImg, 'PNG', 0, footerY, imgWidth, imgHeight);
  }

  return doc;
}
