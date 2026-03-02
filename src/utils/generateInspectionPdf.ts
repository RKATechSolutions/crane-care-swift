import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import rkaHeaderUrl from '@/assets/rka-pdf-header.png';
import rkaFooterUrl from '@/assets/rka-pdf-footer.png';

interface InspectionResponse {
  question_text: string;
  section: string;
  answer_value: string | null;
  pass_fail_status: string | null;
  severity: string | null;
  comment: string | null;
  defect_flag: boolean;
  photo_urls: string[];
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
  let headerImg: HTMLImageElement | undefined;
  let footerImg: HTMLImageElement | undefined;
  try { headerImg = await loadImage(rkaHeaderUrl); } catch { /* skip */ }
  try { footerImg = await loadImage(rkaFooterUrl); } catch { /* skip */ }

  const addHeader = () => {
    if (headerImg) doc.addImage(headerImg, 'PNG', 0, 0, pageW, 25);
  };
  const addFooter = () => {
    if (footerImg) doc.addImage(footerImg, 'PNG', 0, pageH - 20, pageW, 20);
  };

  // Cover page
  addHeader();
  let y = 40;

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

  addFooter();

  // Detail pages
  for (const section of sections) {
    doc.addPage();
    addHeader();
    let sy = 32;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(section.name, 15, sy);
    sy += 4;

    const tableData = section.questions.map(q => {
      const status = q.pass_fail_status || q.answer_value || '—';
      return [
        q.question_text,
        status,
        q.severity || '—',
        q.comment || '',
      ];
    });

    autoTable(doc, {
      startY: sy,
      head: [['Item', 'Result', 'Severity', 'Comment']],
      body: tableData,
      margin: { left: 15, right: 15, bottom: 25 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 1) {
          const val = String(hookData.cell.raw);
          if (val === 'Pass' || val === 'Yes') hookData.cell.styles.textColor = RKA_GREEN;
          else if (val === 'Fail' || val === 'No') hookData.cell.styles.textColor = RKA_RED;
        }
      },
    });

    addFooter();
  }

  // Defect register page (if any defects)
  const allDefects = sections.flatMap(s => s.questions.filter(q => q.defect_flag));
  if (allDefects.length > 0) {
    doc.addPage();
    addHeader();
    let dy = 32;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Defect Register', 15, dy);
    dy += 4;

    const defectData = allDefects.map((d, i) => [
      String(i + 1),
      d.question_text,
      d.severity || '—',
      d.comment || '',
    ]);

    autoTable(doc, {
      startY: dy,
      head: [['#', 'Item', 'Severity', 'Comment']],
      body: defectData,
      margin: { left: 15, right: 15, bottom: 25 },
      headStyles: { fillColor: RKA_RED, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: DARK },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 70 } },
    });

    addFooter();
  }

  return doc;
}
