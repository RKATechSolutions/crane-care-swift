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
}

interface InspectionPdfData {
  formName: string;
  assetName: string;
  siteName?: string;
  technicianName: string;
  inspectionDate: string;
  craneStatus?: string;
  sections: { name: string; questions: InspectionResponse[] }[];
}

const RKA_GREEN: [number, number, number] = [96, 179, 76];
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
  const { formName, assetName, siteName, technicianName, inspectionDate, craneStatus, sections } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Load brand images
  let logoImg: HTMLImageElement | undefined;
  try { logoImg = await loadImage(rkaLogoUrl); } catch { /* skip */ }

  const addHeader = () => {
    if (logoImg) {
      const logoH = 16;
      const logoW = logoH * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, 4, logoW, logoH);
    }
  };

  // Cover page
  addHeader();
  let y = 30;

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
  doc.text(`Date: ${format(new Date(inspectionDate), 'dd MMM yyyy')}`, pageW / 2, y, { align: 'center' });
  y += 10;

  // Overall status
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

  // Stats summary
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const defectCount = sections.reduce((sum, s) => sum + s.questions.filter(q => q.defect_flag).length, 0);
  const passCount = sections.reduce((sum, s) => sum + s.questions.filter(q => q.pass_fail_status === 'Pass').length, 0);

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Items: ${totalQuestions}  |  Passed: ${passCount}  |  Defects: ${defectCount}`, pageW / 2, y, { align: 'center' });

  // All sections continuously on subsequent pages
  doc.addPage();
  addHeader();
  let sy = 28;
  const bottomMargin = 14;

  for (const section of sections) {
    if (sy > pageH - bottomMargin - 25) {
      doc.addPage();
      addHeader();
      sy = 28;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(section.name, 15, sy);
    sy += 3;

    const tableData = section.questions.map(q => {
      const status = q.pass_fail_status || q.answer_value || '—';
      return [
        q.question_text,
        q.standard_ref || '—',
        status,
        q.severity || '—',
        q.comment || '',
      ];
    });

    autoTable(doc, {
      startY: sy,
      head: [['Item', 'Std Ref', 'Result', 'Severity', 'Comment']],
      body: tableData,
      margin: { left: 15, right: 15, bottom: bottomMargin },
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 20, halign: 'center', fontSize: 6.5 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const val = String(hookData.cell.raw);
          if (val === 'Pass' || val === 'Yes') hookData.cell.styles.textColor = RKA_GREEN;
          else if (val === 'Fail' || val === 'No') hookData.cell.styles.textColor = RKA_RED;
        }
      },
      didDrawPage: () => {
        addHeader();
      },
    });

    sy = (doc as any).lastAutoTable?.finalY + 8 || 28;
  }

  // Defect register — sorted by urgency priority
  const urgencyOrder: Record<string, number> = { 'Immediate': 0, 'Urgent': 1, 'Scheduled': 2, 'Monitor': 3 };
  const allDefects = sections.flatMap(s => s.questions.filter(q => q.defect_flag))
    .sort((a, b) => (urgencyOrder[a.urgency || ''] ?? 99) - (urgencyOrder[b.urgency || ''] ?? 99));

  if (allDefects.length > 0) {
    if (sy > pageH - bottomMargin - 25) {
      doc.addPage();
      addHeader();
      sy = 28;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Defect Register — Priority Order', 15, sy);
    sy += 3;

    const defectData = allDefects.map((d, i) => [
      String(i + 1),
      d.question_text,
      d.urgency || '—',
      d.severity || '—',
      d.standard_ref || '—',
      d.comment || '',
    ]);

    autoTable(doc, {
      startY: sy,
      head: [['#', 'Item', 'Urgency', 'Severity', 'Std Ref', 'Recommended Action']],
      body: defectData,
      margin: { left: 15, right: 15, bottom: bottomMargin },
      headStyles: { fillColor: RKA_RED, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 50 }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 18, halign: 'center', fontSize: 6.5 } },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const val = String(hookData.cell.raw);
          if (val === 'Immediate') hookData.cell.styles.textColor = RKA_RED;
          else if (val === 'Urgent') hookData.cell.styles.textColor = RKA_ORANGE;
        }
      },
      didDrawPage: () => {
        addHeader();
      },
    });
  }

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' });
  }

  return doc;
}
