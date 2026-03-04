import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import rkaLogoUrl from '@/assets/rka-main-logo.png';

interface InspectionResponse {
  question_text: string;
  section: string;
  answer_value: string | null;
  pass_fail_status: string | null;
  severity: string | null;
  comment: string | null;
  defect_flag: boolean;
  photo_urls: string[];
  standard_ref?: string | null;
  urgency?: string | null;
  defect_types?: string[];
  internal_note?: string | null;
}

interface InspectionPdfData {
  formName: string;
  assetName: string;
  siteName?: string;
  technicianName: string;
  inspectionDate: string;
  craneStatus?: string;
  sections: { name: string; questions: InspectionResponse[] }[];
  aiSummary?: string;
  otherNotes?: string;
}

const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_GREEN_DARK: [number, number, number] = [60, 130, 45];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateInspectionPdf(data: InspectionPdfData): Promise<jsPDF> {
  const { formName, assetName, siteName, technicianName, inspectionDate, craneStatus, sections, aiSummary, otherNotes } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const dateStr = format(new Date(inspectionDate), 'dd MMM yyyy');

  let logoImg: HTMLImageElement | undefined;
  try { logoImg = await loadImage(rkaLogoUrl); } catch { /* skip */ }

  const addHeader = () => {
    if (logoImg) {
      const logoH = 12;
      const logoW = logoH * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, 'PNG', 14, 4, logoW, logoH);
    }
  };

  const addFooter = () => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Completed by ${technicianName}  •  ${dateStr}`, 15, pageH - 6);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - 15, pageH - 6, { align: 'right' });
  };

  // ========== PAGE 1: COVER ==========
  addHeader();
  let y = 24;

  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(formName, pageW / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(assetName, pageW / 2, y, { align: 'center' });
  y += 10;

  if (siteName) {
    doc.setFontSize(12);
    doc.text(siteName, pageW / 2, y, { align: 'center' });
    y += 8;
  }

  doc.setFontSize(10);
  doc.text(`Technician: ${technicianName}`, pageW / 2, y, { align: 'center' });
  y += 6;
  doc.text(`Date: ${dateStr}`, pageW / 2, y, { align: 'center' });
  y += 10;

  // Overall status badge
  if (craneStatus) {
    const statusColor = craneStatus === 'Safe to Operate' ? RKA_GREEN
      : craneStatus === 'Operate with Limitations' ? RKA_ORANGE : RKA_RED;
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageW / 2 - 40, y, 80, 10, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(craneStatus.toUpperCase(), pageW / 2, y + 7, { align: 'center' });
    y += 16;
  }

  // Stats
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const defectCount = sections.reduce((sum, s) => sum + s.questions.filter(q => q.defect_flag).length, 0);
  const passCount = sections.reduce((sum, s) => sum + s.questions.filter(q => q.pass_fail_status === 'Pass').length, 0);
  const failCount = sections.reduce((sum, s) => sum + s.questions.filter(q => q.pass_fail_status === 'Fail' || q.pass_fail_status === 'No').length, 0);
  const naCount = totalQuestions - passCount - failCount;
  const passPercent = totalQuestions > 0 ? Math.round((passCount / totalQuestions) * 100) : 0;
  const defectPercent = totalQuestions > 0 ? Math.round((defectCount / totalQuestions) * 100) : 0;
  const failPercent = totalQuestions > 0 ? Math.round((failCount / totalQuestions) * 100) : 0;
  const naPercent = totalQuestions > 0 ? 100 - passPercent - defectPercent - failPercent : 0;

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Items: ${totalQuestions}  |  Passed: ${passCount}  |  Defects: ${defectCount}`, pageW / 2, y, { align: 'center' });
  y += 10;

  // Risk bar
  const barX = 30;
  const barW = pageW - 60;
  const barH = 8;
  const passW = (passPercent / 100) * barW;
  const defW = (defectPercent / 100) * barW;
  const fW = (failPercent / 100) * barW;
  const nW = barW - passW - defW - fW;

  if (passW > 0) { doc.setFillColor(...RKA_GREEN); doc.rect(barX, y, passW, barH, 'F'); }
  if (defW > 0) { doc.setFillColor(...RKA_ORANGE); doc.rect(barX + passW, y, defW, barH, 'F'); }
  if (fW > 0) { doc.setFillColor(...RKA_RED); doc.rect(barX + passW + defW, y, fW, barH, 'F'); }
  if (nW > 0) { doc.setFillColor(200, 200, 200); doc.rect(barX + passW + defW + fW, y, nW, barH, 'F'); }

  y += barH + 5;

  // Legend
  doc.setFontSize(7.5);
  const legendItems = [
    { label: 'Pass', color: RKA_GREEN, pct: passPercent },
    { label: 'Defect', color: RKA_ORANGE, pct: defectPercent },
    { label: 'Fail', color: RKA_RED, pct: failPercent },
    { label: 'N/A', color: [200, 200, 200] as [number, number, number], pct: naPercent },
  ];
  let lx = barX;
  for (const item of legendItems) {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 3, 3, 'F');
    doc.setTextColor(...DARK);
    doc.text(`${item.label} ${item.pct}%`, lx + 5, y + 3);
    lx += 35;
  }
  y += 10;

  // AI Summary on cover (no month plan)
  if (aiSummary) {
    y += 2;
    doc.setFillColor(...RKA_GREEN);
    doc.rect(15, y, pageW - 30, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('AI Executive Summary', pageW / 2, y + 5.5, { align: 'center' });
    y += 12;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const summaryLines = doc.splitTextToSize(aiSummary.replace(/[#*_`]/g, ''), pageW - 40);
    for (const line of summaryLines) {
      if (y > pageH - 20) { doc.addPage(); addHeader(); addFooter(); y = 22; }
      doc.text(line, 20, y);
      y += 4;
    }
  }

  addFooter();

  // ========== PAGE 2: DEFECT REGISTER (at top) ==========
  const urgencyOrder: Record<string, number> = { 'Immediate': 0, 'Urgent': 1, 'Scheduled': 2, 'Monitor': 3 };
  const allDefects = sections.flatMap(s => s.questions.filter(q => q.defect_flag))
    .sort((a, b) => (urgencyOrder[a.urgency || ''] ?? 99) - (urgencyOrder[b.urgency || ''] ?? 99));

  if (allDefects.length > 0) {
    doc.addPage();
    addHeader();
    let dy = 22;

    // Green section header
    doc.setFillColor(...RKA_RED);
    doc.rect(15, dy, pageW - 30, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(`Defect Register — ${allDefects.length} Item${allDefects.length !== 1 ? 's' : ''} Requiring Action`, pageW / 2, dy + 5.5, { align: 'center' });
    dy += 12;

    const defectData = allDefects.map((d, i) => [
      String(i + 1),
      d.question_text,
      d.urgency || '—',
      (d.defect_types || []).join(', ') || '—',
      d.comment || '',
    ]);

    autoTable(doc, {
      startY: dy,
      head: [['#', 'Item', 'Urgency', 'Category', 'Recommended Action']],
      body: defectData,
      margin: { left: 15, right: 15, bottom: 18 },
      headStyles: { fillColor: RKA_RED, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const val = String(hookData.cell.raw);
          if (val === 'Immediate') hookData.cell.styles.textColor = RKA_RED;
          else if (val === 'Urgent') hookData.cell.styles.textColor = RKA_ORANGE;
        }
      },
      didDrawPage: () => { addHeader(); addFooter(); },
    });

    dy = (doc as any).lastAutoTable?.finalY + 6 || 22;

    // Defect photos
    const defectsWithPhotos = allDefects.filter(d => d.photo_urls.length > 0);
    if (defectsWithPhotos.length > 0) {
      if (dy > pageH - 60) { doc.addPage(); addHeader(); addFooter(); dy = 22; }
      doc.setFillColor(...RKA_ORANGE);
      doc.rect(15, dy, pageW - 30, 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text('Defect Photos', pageW / 2, dy + 5, { align: 'center' });
      dy += 10;

      for (const defect of defectsWithPhotos) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(defect.question_text, 15, dy);
        dy += 4;

        for (const photoUrl of defect.photo_urls) {
          if (dy > pageH - 50) { doc.addPage(); addHeader(); addFooter(); dy = 22; }
          try {
            const photoImg = await loadImage(photoUrl);
            const maxW = 60;
            const maxH = 40;
            const ratio = Math.min(maxW / photoImg.width, maxH / photoImg.height);
            const w = photoImg.width * ratio;
            const h = photoImg.height * ratio;
            doc.addImage(photoImg, 'JPEG', 15, dy, w, h);
            dy += h + 4;
          } catch { /* skip broken photos */ }
        }
        dy += 2;
      }
    }

    addFooter();
  }

  // ========== PASSED ITEMS — 2-column compact layout ==========
  doc.addPage();
  addHeader();
  let sy = 22;
  const bottomMargin = 18;

  for (const section of sections) {
    const passedItems = section.questions.filter(q => !q.defect_flag);
    if (passedItems.length === 0) continue;

    if (sy > pageH - bottomMargin - 20) { doc.addPage(); addHeader(); addFooter(); sy = 22; }

    // Green section header bar
    doc.setFillColor(...RKA_GREEN);
    doc.rect(15, sy, pageW - 30, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(section.name, pageW / 2, sy + 5, { align: 'center' });
    sy += 10;

    // 2-column table for passed items (Item + Result only, plus Comment if exists)
    const colW = (pageW - 34) / 2;
    const itemsWithComments = passedItems.filter(q => q.comment);
    const itemsNoComments = passedItems.filter(q => !q.comment);

    // Items without comments in 2-column layout
    if (itemsNoComments.length > 0) {
      const half = Math.ceil(itemsNoComments.length / 2);
      const col1 = itemsNoComments.slice(0, half);
      const col2 = itemsNoComments.slice(half);
      const maxRows = Math.max(col1.length, col2.length);

      doc.setFontSize(7);
      for (let r = 0; r < maxRows; r++) {
        if (sy > pageH - bottomMargin - 6) { doc.addPage(); addHeader(); addFooter(); sy = 22; }

        // Alternate row background
        if (r % 2 === 0) {
          doc.setFillColor(...LIGHT_GRAY);
          doc.rect(15, sy - 3, pageW - 30, 5, 'F');
        }

        // Col 1
        if (col1[r]) {
          const status = col1[r].pass_fail_status || col1[r].answer_value || '—';
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
          const truncated = col1[r].question_text.length > 45 ? col1[r].question_text.substring(0, 42) + '…' : col1[r].question_text;
          doc.text(truncated, 16, sy);
          if (status === 'Pass' || status === 'Yes') doc.setTextColor(...RKA_GREEN);
          doc.setFont('helvetica', 'bold');
          doc.text(status, 15 + colW - 2, sy, { align: 'right' });
        }

        // Col 2
        if (col2[r]) {
          const status = col2[r].pass_fail_status || col2[r].answer_value || '—';
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
          const truncated = col2[r].question_text.length > 45 ? col2[r].question_text.substring(0, 42) + '…' : col2[r].question_text;
          doc.text(truncated, 17 + colW, sy);
          if (status === 'Pass' || status === 'Yes') doc.setTextColor(...RKA_GREEN);
          doc.setFont('helvetica', 'bold');
          doc.text(status, 15 + colW * 2 + 2, sy, { align: 'right' });
        }

        sy += 5;
      }
    }

    // Items with comments in full-width rows
    if (itemsWithComments.length > 0) {
      for (const q of itemsWithComments) {
        if (sy > pageH - bottomMargin - 10) { doc.addPage(); addHeader(); addFooter(); sy = 22; }
        const status = q.pass_fail_status || q.answer_value || '—';
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.text(q.question_text, 16, sy);
        if (status === 'Pass' || status === 'Yes') doc.setTextColor(...RKA_GREEN);
        doc.setFont('helvetica', 'bold');
        doc.text(status, pageW - 16, sy, { align: 'right' });
        sy += 4;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const commentLines = doc.splitTextToSize(`Comment: ${q.comment}`, pageW - 40);
        for (const cl of commentLines) {
          doc.text(cl, 18, sy);
          sy += 3.5;
        }
        sy += 2;
      }
    }

    sy += 4;
  }

  // Other notes
  if (otherNotes) {
    if (sy > pageH - bottomMargin - 15) { doc.addPage(); addHeader(); addFooter(); sy = 22; }
    doc.setFillColor(...RKA_GREEN);
    doc.rect(15, sy, pageW - 30, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('Additional Notes', pageW / 2, sy + 5, { align: 'center' });
    sy += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    const noteLines = doc.splitTextToSize(otherNotes, pageW - 40);
    for (const nl of noteLines) {
      if (sy > pageH - bottomMargin) { doc.addPage(); addHeader(); addFooter(); sy = 22; }
      doc.text(nl, 20, sy);
      sy += 4;
    }
  }

  addFooter();

  // Fix page numbers - update all pages with correct total
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Overwrite footer area
    doc.setFillColor(255, 255, 255);
    doc.rect(pageW - 30, pageH - 9, 30, 6, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 15, pageH - 6, { align: 'right' });
  }

  return doc;
}
