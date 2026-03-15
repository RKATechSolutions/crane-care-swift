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
  photo_urls: string[] | string;
  standard_ref?: string | null;
  urgency?: string | null;
  defect_types?: string[] | string;
  internal_note?: string | null;
}

function safeStringArray(val: string[] | string | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map(v => String(v));
  } catch {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1);
      if (!inner) return [];
      return inner
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map(s => s.trim().replace(/^"(.*)"$/, '$1'))
        .map(s => s.replace(/\\"/g, '"'))
        .filter(Boolean);
    }
  }
  return [];
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
  assetPhotoUrl?: string;
}

const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_GREEN_DARK: [number, number, number] = [60, 130, 45];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const NA_GRAY: [number, number, number] = [132, 142, 156];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadRemoteImage(src: string): Promise<HTMLImageElement> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    return loadImage(dataUrl);
  } catch {
    return loadImage(src);
  }
}

export async function generateInspectionPdf(data: InspectionPdfData): Promise<jsPDF> {
  const { formName, assetName, siteName, technicianName, inspectionDate, craneStatus, sections, aiSummary, assetPhotoUrl } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const dateStr = format(new Date(inspectionDate), 'dd MMM yyyy');

  let logoImg: HTMLImageElement | undefined;
  try { logoImg = await loadImage(rkaLogoUrl); } catch { /* skip */ }

  let assetImg: HTMLImageElement | undefined;
  if (assetPhotoUrl) {
    try { assetImg = await loadRemoteImage(assetPhotoUrl); } catch { /* skip */ }
  }

  const addHeader = () => {
    if (logoImg) {
      const logoH = 10;
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
  let y = 20;

  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Report', pageW / 2, y, { align: 'center' });
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

  // Asset Outcome badge — prominently on front page
  if (craneStatus) {
    // User wants Green for pass and Red for defects (no orange)
    const statusColor = (craneStatus === 'Crane is Operational') ? RKA_GREEN : RKA_RED;

    doc.setFillColor(...statusColor);
    const badgeLabel = craneStatus;
    const badgeW = Math.max(120, doc.getTextWidth(badgeLabel) * 1.5 + 20);
    doc.roundedRect((pageW - badgeW) / 2, y, badgeW, 14, 3, 3, 'F');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(badgeLabel, pageW / 2, y + 9.5, { align: 'center' });
    y += 20;
  }

  // Stats
  const allQuestions = sections.flatMap(s => s.questions);
  const totalQuestions = allQuestions.length;
  // Mirror the same fail/pass logic used in StandardQuestionBlock UI.
  // pass_fail_status='Pass' always wins — corrupted defect_flag values in the DB
  // (where defect_flag=true even for passed items) must not override an explicit pass status.
  const failTriggers = ['Fail', 'No', 'Present but Not Maintained', 'Overdue'];
  const passValues = ['Pass', 'Yes', 'Current', 'Compliant', 'Not Required'];
  const isDefect = (q: InspectionResponse) =>
    // An explicit Pass status always wins — never treat a passed item as a defect
    q.pass_fail_status !== 'Pass' &&
    !passValues.includes(q.answer_value || '') &&
    (q.defect_flag ||
      failTriggers.includes(q.pass_fail_status || '') ||
      failTriggers.includes(q.answer_value || ''));
  const isPass = (q: InspectionResponse) =>
    !isDefect(q) &&
    (passValues.includes(q.pass_fail_status || '') || passValues.includes(q.answer_value || ''));
  const isNA = (q: InspectionResponse) =>
    q.pass_fail_status === 'NA' ||
    q.answer_value === 'NA' ||
    q.answer_value === 'N/A';
  const defectCount = allQuestions.filter(isDefect).length;
  const passCount = allQuestions.filter(isPass).length;
  const naCount = allQuestions.filter(q => !isDefect(q) && !isPass(q) && isNA(q)).length;
  const remainingCount = Math.max(totalQuestions - passCount - defectCount - naCount, 0);
  const naDisplayCount = naCount + remainingCount;
  
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Items: ${totalQuestions}  |  Passed: ${passCount}  |  Defects Noted: ${defectCount}  |  N/A: ${naDisplayCount}`, pageW / 2, y, { align: 'center' });
  y += 10;

  // Risk bar
  const barX = 30;
  const barW = pageW - 60;
  const barH = 8;
  const barTotal = totalQuestions;
  const passW = barTotal > 0 ? (passCount / barTotal) * barW : 0;
  const defW = barTotal > 0 ? (defectCount / barTotal) * barW : 0;
  const naW = barTotal > 0 ? (naDisplayCount / barTotal) * barW : 0;

  if (passW > 0) { doc.setFillColor(...RKA_GREEN); doc.rect(barX, y, passW, barH, 'F'); }
  if (defW > 0) { doc.setFillColor(...RKA_RED); doc.rect(barX + passW, y, defW, barH, 'F'); }
  if (naW > 0) { doc.setFillColor(...NA_GRAY); doc.rect(barX + passW + defW, y, naW, barH, 'F'); }

  y += barH + 5;

  // Legend
  doc.setFontSize(7.5);
  const legendItems = [
    { label: 'Pass', color: RKA_GREEN, count: passCount },
    { label: 'Defect', color: RKA_RED, count: defectCount },
    { label: 'N/A', color: NA_GRAY, count: naDisplayCount },
  ];
  let lx = barX;
  for (const item of legendItems) {
    doc.setFillColor(...item.color);
    doc.rect(lx, y, 3, 3, 'F');
    doc.setTextColor(...DARK);
    doc.text(`${item.label} (${item.count})`, lx + 5, y + 3);
    lx += 35;
  }
  y += 10;

  // Asset photo on cover - ensure it's always there
  const maxPhotoW = 100;
  const maxPhotoH = 70;
  const imgX = (pageW - maxPhotoW) / 2;

  if (assetImg) {
    const ratio = Math.min(maxPhotoW / assetImg.width, maxPhotoH / assetImg.height);
    const imgW = assetImg.width * ratio;
    const imgH = assetImg.height * ratio;
    const centeredX = (pageW - imgW) / 2;
    doc.addImage(assetImg, 'JPEG', centeredX, y, imgW, imgH);
    y += imgH + 6;
  } else {
    // Placeholder if no photo
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(imgX, y, maxPhotoW, maxPhotoH, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Asset Photo Not Available', pageW / 2, y + (maxPhotoH / 2), { align: 'center' });
    y += maxPhotoH + 6;
  }

  // Summary on cover (no heading titles like "Key Defects" etc)
  if (aiSummary) {
    y += 2;
    doc.setFillColor(...RKA_GREEN);
    doc.rect(15, y, pageW - 30, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('Summary', pageW / 2, y + 5.5, { align: 'center' });
    y += 12;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);

    const summaryClean = aiSummary.replace(/[*_`]/g, '');
    const summaryParts = summaryClean.split('\n');
    for (const part of summaryParts) {
      const trimmed = part.trim();
      if (!trimmed) { y += 2; continue; }

      // Skip markdown headings (e.g. "## Overall Summary", "## Defects Found")
      if (/^#{1,3}\s+/.test(trimmed)) continue;

      const lines = doc.splitTextToSize(trimmed, pageW - 44);
      for (const line of lines) {
        if (y > pageH - 20) { doc.addPage(); addHeader(); addFooter(); y = 22; }
        doc.text(line, 22, y);
        y += 4;
      }
    }
  }

  // (Asset Outcome badge already placed at top of page 1)

  addFooter();

  // ========== PAGE 2: DEFECT REGISTER ==========
  const urgencyOrder: Record<string, number> = {
    'Immediate - Remove From Service and Repair Immediately': 0,
    'Urgent Repair Within 7 Days': 1,
    'Schedule Repair Before Next Service': 2,
    'Monitor': 3,
  };
  const allDefects = sections.flatMap(s => s.questions.filter(isDefect))
    .sort((a, b) => (urgencyOrder[a.urgency || ''] ?? 99) - (urgencyOrder[b.urgency || ''] ?? 99));

  if (allDefects.length > 0) {
    doc.addPage();
    addHeader();
    let dy = 18;

    doc.setFillColor(...RKA_RED);
    doc.rect(15, dy, pageW - 30, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(`Defect Register — ${allDefects.length} Item${allDefects.length !== 1 ? 's' : ''} Requiring Action`, pageW / 2, dy + 5.5, { align: 'center' });
    dy += 12;

    for (let i = 0; i < allDefects.length; i++) {
      const d = allDefects[i];
      const hasPhotos = safeStringArray(d.photo_urls).length > 0;
      const cardH = hasPhotos ? Math.max(36, 20) : 20;

      if (dy > pageH - cardH - 18) { doc.addPage(); addHeader(); addFooter(); dy = 18; }

      if (i % 2 === 0) {
        doc.setFillColor(...LIGHT_GRAY);
        doc.rect(15, dy - 2, pageW - 30, cardH + 4, 'F');
      }

      const urgColor = d.urgency?.startsWith('Immediate') ? RKA_RED : 
                        d.urgency?.startsWith('Urgent') ? RKA_ORANGE : 
                        d.urgency?.startsWith('Schedule') ? [230, 200, 50] as [number, number, number] : 
                        d.urgency === 'Monitor' ? [255, 243, 205] as [number, number, number] : RKA_GREEN;
      doc.setFillColor(...(urgColor as [number, number, number]));
      doc.rect(15, dy - 2, 3, cardH + 4, 'F');

      const textAreaW = hasPhotos ? pageW - 80 : pageW - 36;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      const qLines = doc.splitTextToSize(`${i + 1}. ${d.question_text}`, textAreaW);
      let ty = dy;
      for (const ql of qLines) {
        doc.text(ql, 20, ty);
        ty += 3.5;
      }

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      if (d.urgency) {
        if (d.urgency?.startsWith('Immediate') || d.urgency?.startsWith('Urgent')) {
          doc.setTextColor(...(d.urgency.startsWith('Immediate') ? RKA_RED : RKA_ORANGE));
        } else {
          doc.setTextColor(...DARK);
        }
        doc.text(`Urgency: ${d.urgency}`, 20, ty);
        ty += 3.5;
      }
      doc.setTextColor(...DARK);
      const defectTypesArr = safeStringArray(d.defect_types);
      if (defectTypesArr.length > 0) {
        doc.text(`Category: ${defectTypesArr.join(', ')}`, 20, ty);
        ty += 3.5;
      }

      if (d.comment) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80, 80, 80);
        const commentLines = doc.splitTextToSize(`Comment: ${d.comment}`, textAreaW);
        for (const cl of commentLines) {
          doc.text(cl, 20, ty);
          ty += 3.5;
        }
      }

      if (hasPhotos) {
        const photoX = pageW - 55;
        let photoY = dy - 1;
        for (const photoUrl of safeStringArray(d.photo_urls).slice(0, 2)) {
          try {
            const photoImg = await loadRemoteImage(photoUrl);
            const maxW = 38;
            const maxH = 28;
            const ratio = Math.min(maxW / photoImg.width, maxH / photoImg.height);
            const w = photoImg.width * ratio;
            const h = photoImg.height * ratio;
            doc.addImage(photoImg, 'JPEG', photoX, photoY, w, h);
            photoY += h + 2;
          } catch { /* skip */ }
        }
        const photoBottom = photoY - dy + 2;
        if (photoBottom > cardH) {
          dy += photoBottom + 4;
        } else {
          dy += cardH + 4;
        }
      } else {
        const textBottom = ty - dy + 2;
        dy += Math.max(textBottom, cardH) + 4;
      }
    }

    addFooter();
  }

  // ========== PASSED ITEMS — 2-column compact layout ==========
  doc.addPage();
  addHeader();
  let sy = 18;
  const bottomMargin = 18;

  for (const section of sections) {
    const passedItems = section.questions.filter(q => !isDefect(q) && q.question_text !== 'Asset Status');
    if (passedItems.length === 0) continue;

    if (sy > pageH - bottomMargin - 20) { doc.addPage(); addHeader(); addFooter(); sy = 18; }

    doc.setFillColor(...RKA_GREEN);
    doc.rect(15, sy, pageW - 30, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(section.name, pageW / 2, sy + 5, { align: 'center' });
    sy += 10;

    const itemsWithComments = passedItems.filter(q => q.comment);
    const itemsNoComments = passedItems.filter(q => !q.comment);

    if (itemsNoComments.length > 0) {
      const colW = (pageW - 34) / 2;
      const half = Math.ceil(itemsNoComments.length / 2);
      const col1 = itemsNoComments.slice(0, half);
      const col2 = itemsNoComments.slice(half);
      const maxRows = Math.max(col1.length, col2.length);

      doc.setFontSize(6.5);
      for (let r = 0; r < maxRows; r++) {
        if (sy > pageH - bottomMargin - 6) { doc.addPage(); addHeader(); addFooter(); sy = 18; }

        if (r % 2 === 0) {
          doc.setFillColor(...LIGHT_GRAY);
          doc.rect(15, sy - 3, pageW - 30, 5, 'F');
        }

        if (col1[r]) {
          const status = col1[r].pass_fail_status || col1[r].answer_value || '—';
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
          const maxChars = 55;
          const truncated = col1[r].question_text.length > maxChars ? col1[r].question_text.substring(0, maxChars - 3) + '…' : col1[r].question_text;
          doc.text(truncated, 16, sy);
          if (status === 'Pass' || status === 'Yes') doc.setTextColor(...RKA_GREEN);
          doc.setFont('helvetica', 'bold');
          doc.text(status, 15 + colW - 2, sy, { align: 'right' });
        }

        if (col2[r]) {
          const status = col2[r].pass_fail_status || col2[r].answer_value || '—';
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...DARK);
          const maxChars = 55;
          const truncated = col2[r].question_text.length > maxChars ? col2[r].question_text.substring(0, maxChars - 3) + '…' : col2[r].question_text;
          doc.text(truncated, 17 + colW, sy);
          if (status === 'Pass' || status === 'Yes') doc.setTextColor(...RKA_GREEN);
          doc.setFont('helvetica', 'bold');
          doc.text(status, 15 + colW * 2 + 2, sy, { align: 'right' });
        }

        sy += 5;
      }
    }

    if (itemsWithComments.length > 0) {
      for (const q of itemsWithComments) {
        if (sy > pageH - bottomMargin - 10) { doc.addPage(); addHeader(); addFooter(); sy = 18; }
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

  // NOTE: otherNotes and internal_note intentionally excluded from customer report

  addFooter();

  // Fix page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(255, 255, 255);
    doc.rect(pageW - 30, pageH - 9, 30, 6, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 15, pageH - 6, { align: 'right' });
  }

  return doc;
}
