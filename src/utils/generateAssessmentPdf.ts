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
const RKA_DARK_GREEN: [number, number, number] = [34, 139, 69];

interface PdfImages {
  headerImg?: HTMLImageElement;
  footerImg?: HTMLImageElement;
}

function addHeader(doc: jsPDF, pageTitle: string, imgs: PdfImages): number {
  const pageW = doc.internal.pageSize.getWidth();

  if (imgs.headerImg) {
    const imgAspect = imgs.headerImg.width / imgs.headerImg.height;
    const headerH = pageW / imgAspect;
    doc.addImage(imgs.headerImg, 'PNG', 0, 0, pageW, headerH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(pageTitle, pageW - 14, headerH + 8, { align: 'right' });
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.3);
    doc.line(14, headerH + 11, pageW - 14, headerH + 11);
    return headerH + 15;
  }

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

// ═══════════════════════════════════
// DASHBOARD DRAWING HELPERS
// ═══════════════════════════════════

function getScoreColor(pct: number): [number, number, number] {
  if (pct >= 75) return RKA_GREEN;
  if (pct >= 40) return RKA_ORANGE;
  return RKA_RED;
}

function getMaturityLabel(pct: number): string {
  if (pct >= 85) return 'LEADING';
  if (pct >= 70) return 'ESTABLISHED';
  if (pct >= 50) return 'DEVELOPING';
  if (pct >= 30) return 'EMERGING';
  return 'FOUNDATIONAL';
}

function drawTrafficLightScorecard(doc: jsPDF, x: number, y: number, w: number, data: AssessmentPdfData): number {
  // Title
  doc.setFillColor(...DARK);
  doc.roundedRect(x, y, w, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('COMPLIANCE SCORECARD', x + w / 2, y + 5, { align: 'center' });
  y += 10;

  const colW = w / 4;
  const rowH = 10;

  partBFacets.forEach((f, i) => {
    const score = data.facetScores[f.id] || 0;
    const max = f.questions.length * 2;
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    const color = getScoreColor(pct);

    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = x + col * colW + colW / 2;
    const cy = y + row * (rowH + 14) + 5;

    // Traffic light circle
    doc.setFillColor(...color);
    doc.circle(cx, cy, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(`${pct}%`, cx, cy + 2.5, { align: 'center' });

    // Label below
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...DARK);
    const shortName = f.title.length > 18 ? f.title.substring(0, 16) + '…' : f.title;
    doc.text(shortName, cx, cy + 8, { align: 'center' });
  });

  const rows = Math.ceil(partBFacets.length / 4);
  return y + rows * (rowH + 14) + 2;
}

function drawMaturityGauge(doc: jsPDF, cx: number, cy: number, radius: number, data: AssessmentPdfData) {
  const maxTotal = partBFacets.reduce((sum, f) => sum + f.questions.length * 2, 0);
  const overallPct = maxTotal > 0 ? Math.round((data.totalScore / maxTotal) * 100) : 0;
  const label = getMaturityLabel(overallPct);

  // Draw semicircle arc segments (background)
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const segments = 30;

  // Background arc
  for (let i = 0; i < segments; i++) {
    const a1 = startAngle + (i / segments) * Math.PI;
    const a2 = startAngle + ((i + 1) / segments) * Math.PI;
    const segPct = (i / segments) * 100;
    const color = getScoreColor(segPct);
    doc.setDrawColor(...color);
    doc.setLineWidth(3);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    const x2 = cx + radius * Math.cos(a2);
    const y2 = cy + radius * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }

  // Needle
  const needleAngle = startAngle + (overallPct / 100) * Math.PI;
  const needleLen = radius - 4;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);
  doc.setDrawColor(...DARK);
  doc.setLineWidth(1);
  doc.line(cx, cy, nx, ny);
  doc.setFillColor(...DARK);
  doc.circle(cx, cy, 2, 'F');

  // Percentage text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(`${overallPct}%`, cx, cy + 6, { align: 'center' });

  // Label below
  const labelColor = getScoreColor(overallPct);
  doc.setFillColor(...labelColor);
  doc.roundedRect(cx - 18, cy + 9, 36, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(label, cx, cy + 14, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('OVERALL SITE MATURITY', cx, cy - radius - 6, { align: 'center' });
}

function drawRadarChart(doc: jsPDF, cx: number, cy: number, radius: number, data: AssessmentPdfData) {
  const facets = partBFacets;
  const n = facets.length;
  const angleStep = (2 * Math.PI) / n;
  const offset = -Math.PI / 2; // Start from top

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('FACET PERFORMANCE RADAR', cx, cy - radius - 8, { align: 'center' });

  // Draw concentric rings (25%, 50%, 75%, 100%)
  [0.25, 0.5, 0.75, 1.0].forEach(ring => {
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    const r = radius * ring;
    // Draw polygon for ring
    for (let i = 0; i < n; i++) {
      const a1 = offset + i * angleStep;
      const a2 = offset + ((i + 1) % n) * angleStep;
      doc.line(
        cx + r * Math.cos(a1), cy + r * Math.sin(a1),
        cx + r * Math.cos(a2), cy + r * Math.sin(a2)
      );
    }
  });

  // Draw axis lines
  for (let i = 0; i < n; i++) {
    const angle = offset + i * angleStep;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.line(cx, cy, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }

  // Data polygon - filled
  const points: { x: number; y: number }[] = [];
  facets.forEach((f, i) => {
    const score = data.facetScores[f.id] || 0;
    const max = f.questions.length * 2;
    const pct = max > 0 ? score / max : 0;
    const angle = offset + i * angleStep;
    const r = radius * pct;
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });

  // Draw filled polygon
  if (points.length > 0) {
    doc.setFillColor(96, 179, 76);
    doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
    // Draw as lines connecting points
    doc.setDrawColor(...RKA_GREEN);
    doc.setLineWidth(0.8);
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      doc.line(points[i].x, points[i].y, next.x, next.y);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Draw data polygon outline again solid
    doc.setDrawColor(...RKA_GREEN);
    doc.setLineWidth(1);
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      doc.line(points[i].x, points[i].y, next.x, next.y);
    }

    // Data points
    points.forEach(p => {
      doc.setFillColor(...RKA_GREEN);
      doc.circle(p.x, p.y, 1.2, 'F');
    });
  }

  // Labels
  facets.forEach((f, i) => {
    const angle = offset + i * angleStep;
    const labelR = radius + 8;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...DARK);
    const align = Math.cos(angle) < -0.1 ? 'right' : Math.cos(angle) > 0.1 ? 'left' : 'center';
    const shortName = facetNames[f.id] || f.title;
    doc.text(shortName, lx, ly + 1.5, { align: align as any });
  });
}

function drawRiskPriorityMatrix(doc: jsPDF, x: number, y: number, w: number, data: AssessmentPdfData): number {
  // Title
  doc.setFillColor(...DARK);
  doc.roundedRect(x, y, w, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('RISK PRIORITY MATRIX', x + w / 2, y + 5, { align: 'center' });
  y += 10;

  // Sort facets by score ascending (highest risk first)
  const sorted = partBFacets
    .map(f => {
      const score = data.facetScores[f.id] || 0;
      const max = f.questions.length * 2;
      const pct = max > 0 ? Math.round((score / max) * 100) : 0;
      return { facet: f, score, max, pct };
    })
    .sort((a, b) => a.pct - b.pct);

  // Table header
  const colWidths = [w * 0.06, w * 0.38, w * 0.14, w * 0.14, w * 0.28];
  const headers = ['#', 'Facet', 'Score', 'Status', 'Action Window'];
  doc.setFillColor(...RKA_GREEN);
  doc.rect(x, y, w, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...WHITE);
  let hx = x + 1;
  headers.forEach((h, i) => {
    doc.text(h, hx + 1, y + 4);
    hx += colWidths[i];
  });
  y += 7;

  sorted.forEach((item, idx) => {
    const rowColor = idx % 2 === 0 ? LIGHT_GRAY : WHITE;
    doc.setFillColor(...rowColor);
    doc.rect(x, y, w, 7, 'F');

    const statusColor = getScoreColor(item.pct);
    const statusLabel = item.pct >= 75 ? 'LOW' : item.pct >= 40 ? 'MEDIUM' : 'HIGH';
    const actionWindow = item.pct >= 75 ? 'LATER (6-12 mo)' : item.pct >= 40 ? 'NEXT (3-6 mo)' : 'NOW (0-3 mo)';

    let rx = x + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...DARK);

    // Rank
    doc.text(`${idx + 1}`, rx + 1, y + 5);
    rx += colWidths[0];

    // Facet name
    doc.text(item.facet.title, rx + 1, y + 5);
    rx += colWidths[1];

    // Score
    doc.text(`${item.score}/${item.max} (${item.pct}%)`, rx + 1, y + 5);
    rx += colWidths[2];

    // Status pill
    doc.setFillColor(...statusColor);
    doc.roundedRect(rx + 1, y + 1.5, colWidths[3] - 4, 4, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...WHITE);
    doc.text(statusLabel, rx + colWidths[3] / 2 - 1, y + 4.5, { align: 'center' });
    rx += colWidths[3];

    // Action window
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...DARK);
    const actionColor = item.pct >= 75 ? RKA_GREEN : item.pct >= 40 ? RKA_ORANGE : RKA_RED;
    doc.setTextColor(...actionColor);
    doc.setFont('helvetica', 'bold');
    doc.text(actionWindow, rx + 1, y + 5);

    y += 7;
  });

  return y + 4;
}

// ═══════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════

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
  // PAGE 2: DASHBOARD
  // ═══════════════════════════════════
  doc.addPage();
  y = addHeader(doc, 'Site Assessment Report', imgs);
  y = addSectionTitle(doc, y, 'Assessment Dashboard');

  // Layout: Left column = Gauge + Radar, Right column = Scorecard + Matrix
  const leftX = 14;
  const rightX = pageW / 2 + 4;
  const halfW = pageW / 2 - 18;

  // TOP LEFT: Overall Maturity Gauge
  const gaugeCx = leftX + halfW / 2;
  const gaugeCy = y + 32;
  drawMaturityGauge(doc, gaugeCx, gaugeCy, 22, data);

  // TOP RIGHT: Traffic Light Scorecard
  drawTrafficLightScorecard(doc, rightX, y, halfW, data);

  // BOTTOM LEFT: Radar Chart
  const radarY = y + 65;
  const radarCx = leftX + halfW / 2;
  const radarCy = radarY + 35;
  drawRadarChart(doc, radarCx, radarCy, 25, data);

  // BOTTOM: Risk Priority Matrix (full width)
  const matrixY = radarY + 72;
  drawRiskPriorityMatrix(doc, 14, matrixY, contentW, data);

  // ═══════════════════════════════════
  // PAGE 3: FACET SCORE SUMMARY TABLE
  // ═══════════════════════════════════
  doc.addPage();
  y = addHeader(doc, 'Site Assessment Report', imgs);
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
  // AI EXECUTIVE SUMMARY
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
