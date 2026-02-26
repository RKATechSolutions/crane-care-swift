import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { partBFacets, facetNames } from '@/data/siteAssessmentQuestions';
import rkaHeaderUrl from '@/assets/rka-pdf-header.png';
import rkaFooterUrl from '@/assets/rka-pdf-footer.png';

interface AssessmentPdfData {
  siteName: string;
  assessmentType: string;
  completionMethod: string;
  technicianName: string;
  completedAt?: string;
  facetScores: Record<string, number>;
  totalScore: number;
  countNotYet: number;
  countPartial: number;
  highestRiskFacet: string;
  strongestFacet: string;
  aiSummary: string;
  facetNotes: Record<string, string>;
  clientAddress?: string;
  clientContactName?: string;
  clientContactPhone?: string;
  clientContactEmail?: string;
}

// RKA brand colours (from Brand Guidelines)
const RKA_GREEN: [number, number, number] = [96, 179, 76];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];

interface PdfImages {
  headerImg?: HTMLImageElement;
  footerImg?: HTMLImageElement;
}

function addHeader(doc: jsPDF, pageTitle: string, imgs: PdfImages): number {
  const pageW = doc.internal.pageSize.getWidth();

  if (imgs.headerImg) {
    // Header image is wide banner – scale to full page width
    const imgAspect = imgs.headerImg.width / imgs.headerImg.height;
    const headerH = pageW / imgAspect;
    doc.addImage(imgs.headerImg, 'PNG', 0, 0, pageW, headerH);
    // Page title below the header image
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(pageTitle, pageW - 14, headerH + 8, { align: 'right' });
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.3);
    doc.line(14, headerH + 11, pageW - 14, headerH + 11);
    return headerH + 15;
  }

  // Fallback: simple dark bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(pageTitle, pageW - 14, 16, { align: 'right' });
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageW - 14, 30);
  return 34;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number, imgs: PdfImages) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  if (imgs.footerImg) {
    const imgAspect = imgs.footerImg.width / imgs.footerImg.height;
    const footerH = pageW / imgAspect;
    doc.addImage(imgs.footerImg, 'PNG', 0, pageH - footerH, pageW, footerH);
    // Text on top of footer image
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW / 2, pageH - footerH - 3, { align: 'center' });
    doc.text(`Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, pageH - footerH - 3);
    return;
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
  doc.text(`Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, pageH - 8);
  doc.text('service@reports.rkaindustrialsolutions.com.au', pageW - 14, pageH - 8, { align: 'right' });
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...RKA_GREEN);
  doc.rect(14, y, pageW - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(title.toUpperCase(), 18, y + 5.5);
  return y + 12;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, imgs: PdfImages): number {
  const pageH = doc.internal.pageSize.getHeight();
  const footerReserve = imgs.footerImg ? 25 : 20;
  if (y + needed > pageH - footerReserve) {
    doc.addPage();
    return addHeader(doc, 'Site Assessment Report', imgs);
  }
  return y;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number, imgs: PdfImages): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight + 2, imgs);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateAssessmentPdf(data: AssessmentPdfData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  // Load header & footer images
  const imgs: PdfImages = {};
  try { imgs.headerImg = await loadImage(rkaHeaderUrl); } catch { /* fallback */ }
  try { imgs.footerImg = await loadImage(rkaFooterUrl); } catch { /* fallback */ }

  // ═══════════════════════════════════
  // PAGE 1: COVER PAGE
  // ═══════════════════════════════════
  let y = addHeader(doc, 'Site Assessment Report', imgs);

  // Site info box
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(14, y, contentW, 40, 3, 3, 'F');

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(data.siteName, 20, y);

  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(data.assessmentType, 20, y);

  y += 6;
  doc.setFontSize(8);
  doc.text(`Completion Method: ${data.completionMethod}`, 20, y);

  y += 6;
  doc.text(`Technician: ${data.technicianName}`, 20, y);

  y += 6;
  doc.text(`Date: ${data.completedAt ? format(new Date(data.completedAt), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}`, 20, y);

  y += 12;

  // Client details box
  if (data.clientAddress || data.clientContactName || data.clientContactPhone || data.clientContactEmail) {
    doc.setFillColor(...LIGHT_GRAY);
    const boxH = 8 + [data.clientAddress, data.clientContactName, data.clientContactPhone, data.clientContactEmail].filter(Boolean).length * 6;
    doc.roundedRect(14, y, contentW, boxH, 3, 3, 'F');
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text('Client Details', 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    if (data.clientAddress) { doc.text(`Address: ${data.clientAddress}`, 20, y); y += 5; }
    if (data.clientContactName) { doc.text(`Contact: ${data.clientContactName}`, 20, y); y += 5; }
    if (data.clientContactPhone) { doc.text(`Phone: ${data.clientContactPhone}`, 20, y); y += 5; }
    if (data.clientContactEmail) { doc.text(`Email: ${data.clientContactEmail}`, 20, y); y += 5; }
    y += 6;
  }

  // ═══════════════════════════════════
  // FACET SCORE SUMMARY TABLE
  // ═══════════════════════════════════
  y = addSectionTitle(doc, y, 'Facet Score Summary');

  const facetRows = partBFacets.map(f => {
    const score = data.facetScores[f.id] || 0;
    const max = f.questions.length * 2;
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    return [
      `Facet ${f.number}: ${f.title}`,
      `${score} / ${max}`,
      `${pct}%`,
    ];
  });

  facetRows.push(['TOTAL', `${data.totalScore}`, '']);

  autoTable(doc, {
    startY: y,
    head: [['Facet', 'Score', '%']],
    body: facetRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: RKA_GREEN, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    didParseCell: (hookData) => {
      if (hookData.row.index === facetRows.length - 1 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [230, 230, 230];
      }
      if (hookData.column.index === 2 && hookData.section === 'body' && hookData.row.index < facetRows.length - 1) {
        const pctVal = parseInt(hookData.cell.text[0]) || 0;
        if (pctVal >= 75) hookData.cell.styles.textColor = RKA_GREEN;
        else if (pctVal >= 40) hookData.cell.styles.textColor = RKA_ORANGE;
        else hookData.cell.styles.textColor = RKA_RED;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Risk summary
  y = checkPageBreak(doc, y, 20, imgs);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RKA_RED);
  doc.text(`⚠ Highest Risk: ${data.highestRiskFacet}`, 18, y);
  y += 5;
  doc.setTextColor(...RKA_GREEN);
  doc.text(`★ Strongest: ${data.strongestFacet}`, 18, y);
  y += 5;
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Not Yet Implemented: ${data.countNotYet}  |  Partially Implemented: ${data.countPartial}`, 18, y);

  // ═══════════════════════════════════
  // PAGE 2: AI EXECUTIVE SUMMARY
  // ═══════════════════════════════════
  doc.addPage();
  y = addHeader(doc, 'Site Assessment Report', imgs);
  y = addSectionTitle(doc, y, 'Executive Summary & 12-Month Plan');

  if (data.aiSummary) {
    const lines = data.aiSummary.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; continue; }

      y = checkPageBreak(doc, y, 6, imgs);

      if (trimmed.startsWith('## ')) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...DARK);
        doc.text(trimmed.replace(/^#+\s*/, ''), 18, y);
        y += 7;
        continue;
      }
      if (trimmed.startsWith('### ') || trimmed.startsWith('**') && trimmed.endsWith('**')) {
        y += 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        const cleanText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
        y = addWrappedText(doc, cleanText, 18, y, contentW - 8, 4.5, imgs);
        y += 2;
        continue;
      }
      if (trimmed === '---') {
        doc.setDrawColor(...BORDER_GRAY);
        doc.line(14, y, pageW - 14, y);
        y += 4;
        continue;
      }

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        const bulletText = trimmed.replace(/^\*\s+/, '').replace(/^-\s+/, '').replace(/\*\*/g, '');
        doc.text('•', 20, y);
        y = addWrappedText(doc, bulletText, 25, y, contentW - 18, 4, imgs);
        y += 1;
        continue;
      }

      if (/^\d+\./.test(trimmed)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        const cleanText = trimmed.replace(/\*\*/g, '');
        y = addWrappedText(doc, cleanText, 18, y, contentW - 8, 4.5, imgs);
        y += 1;
        continue;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      const cleanText = trimmed.replace(/\*\*/g, '');
      y = addWrappedText(doc, cleanText, 18, y, contentW - 8, 4, imgs);
      y += 1;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No AI summary generated.', 18, y);
  }

  // ═══════════════════════════════════
  // TECHNICIAN NOTES (if any)
  // ═══════════════════════════════════
  const notesEntries = Object.entries(data.facetNotes).filter(([, v]) => v?.trim());
  if (notesEntries.length > 0) {
    doc.addPage();
    y = addHeader(doc, 'Site Assessment Report', imgs);
    y = addSectionTitle(doc, y, 'Technician Notes by Facet');

    for (const [facetId, note] of notesEntries) {
      const facet = partBFacets.find(f => f.id === facetId);
      if (!facet) continue;

      y = checkPageBreak(doc, y, 15, imgs);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(`Facet ${facet.number}: ${facet.title}`, 18, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      y = addWrappedText(doc, note, 18, y, contentW - 8, 4, imgs);
      y += 4;
    }
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, imgs);
  }

  return doc;
}
