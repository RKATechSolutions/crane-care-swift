import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { partBFacets, facetNames } from '@/data/siteAssessmentQuestions';

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

// RKA brand colors (matching existing report)
const RKA_GREEN: [number, number, number] = [34, 139, 69];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [13, 13, 13];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];

function addHeader(doc: jsPDF, pageTitle: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...RKA_GREEN);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text('RKA Crane Services', 14, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Crane Inspection & Maintenance', 14, 18);
  doc.text('ABN: XX XXX XXX XXX', 14, 23);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(pageTitle, pageW - 14, 16, { align: 'right' });
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageW - 14, 30);
  return 34;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
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

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    return addHeader(doc, 'Site Assessment Report');
  }
  return y;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight + 2);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function generateAssessmentPdf(data: AssessmentPdfData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  // ═══════════════════════════════════
  // PAGE 1: COVER PAGE
  // ═══════════════════════════════════
  let y = addHeader(doc, 'Site Assessment Report');

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
      // Highlight total row
      if (hookData.row.index === facetRows.length - 1 && hookData.section === 'body') {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [230, 230, 230];
      }
      // Color code percentage column
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
  y = checkPageBreak(doc, y, 20);
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
  y = addHeader(doc, 'Site Assessment Report');
  y = addSectionTitle(doc, y, 'Executive Summary & 12-Month Plan');

  if (data.aiSummary) {
    // Parse markdown-like text into the PDF
    const lines = data.aiSummary.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 3; continue; }

      y = checkPageBreak(doc, y, 6);

      // Headers
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
        y = addWrappedText(doc, cleanText, 18, y, contentW - 8, 4.5);
        y += 2;
        continue;
      }
      if (trimmed === '---') {
        doc.setDrawColor(...BORDER_GRAY);
        doc.line(14, y, pageW - 14, y);
        y += 4;
        continue;
      }

      // Bullet points
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        const bulletText = trimmed.replace(/^\*\s+/, '').replace(/^-\s+/, '').replace(/\*\*/g, '');
        doc.text('•', 20, y);
        y = addWrappedText(doc, bulletText, 25, y, contentW - 18, 4);
        y += 1;
        continue;
      }

      // Numbered items
      if (/^\d+\./.test(trimmed)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        const cleanText = trimmed.replace(/\*\*/g, '');
        y = addWrappedText(doc, cleanText, 18, y, contentW - 8, 4.5);
        y += 1;
        continue;
      }

      // Normal text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      const cleanText = trimmed.replace(/\*\*/g, '');
      y = addWrappedText(doc, cleanText, 18, y, contentW - 8, 4);
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
    y = addHeader(doc, 'Site Assessment Report');
    y = addSectionTitle(doc, y, 'Technician Notes by Facet');

    for (const [facetId, note] of notesEntries) {
      const facet = partBFacets.find(f => f.id === facetId);
      if (!facet) continue;

      y = checkPageBreak(doc, y, 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(`Facet ${facet.number}: ${facet.title}`, 18, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      y = addWrappedText(doc, note, 18, y, contentW - 8, 4);
      y += 4;
    }
  }

  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return doc;
}
