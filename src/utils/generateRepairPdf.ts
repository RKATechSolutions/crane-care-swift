import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { RepairFormData } from '@/pages/RepairBreakdownForm';
import rkaLogoUrl from '@/assets/rka-main-logo.png';

const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];

interface PdfImages {
  logoImg?: HTMLImageElement;
}

interface RepairPdfData {
  formData: RepairFormData;
  assetName: string;
  siteName?: string;
  technicianName: string;
  assetPhotoUrl?: string;
}

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

function addHeader(doc: jsPDF, pageTitle: string, imgs: PdfImages): number {
  const pageW = doc.internal.pageSize.getWidth();
  if (imgs.logoImg) {
    const logoH = 16;
    const logoW = logoH * (imgs.logoImg.width / imgs.logoImg.height);
    doc.addImage(imgs.logoImg, 'PNG', (pageW - logoW) / 2, 4, logoW, logoH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(pageTitle, pageW - 14, 16, { align: 'right' });
    doc.setDrawColor(...BORDER_GRAY);
    doc.setLineWidth(0.3);
    doc.line(14, 22, pageW - 14, 22);
    return 26;
  }
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(pageTitle, pageW - 14, 16, { align: 'right' });
  return 34;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' });
  doc.text(`Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, pageH - 6);
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

function addInfoRow(doc: jsPDF, y: number, label: string, value: string, maxWidth?: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(label, 18, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  if (maxWidth) {
    doc.text(value || '—', 18, y + 5, { maxWidth });
    return y + 10;
  }
  doc.text(value || '—', 80, y);
  return y + 6;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, imgs: PdfImages, title: string): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 14) {
    doc.addPage();
    return addHeader(doc, title, imgs);
  }
  return y;
}

export async function generateRepairPdf(data: RepairPdfData): Promise<jsPDF> {
  const { formData, assetName, siteName, technicianName, assetPhotoUrl } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  const imgs: PdfImages = {};
  try { imgs.logoImg = await loadImage(rkaLogoUrl); } catch { /* fallback */ }

  let assetImg: HTMLImageElement | undefined;
  if (assetPhotoUrl) {
    try { assetImg = await loadRemoteImage(assetPhotoUrl); } catch { /* skip */ }
  }

  // PAGE 1
  let y = addHeader(doc, 'Repair & Breakdown Report', imgs);

  // Job Info
  y = addSectionTitle(doc, y, 'Job Information');
  y = addInfoRow(doc, y, 'Asset', assetName);
  if (siteName) y = addInfoRow(doc, y, 'Site', siteName);
  y = addInfoRow(doc, y, 'Technician', technicianName);
  y = addInfoRow(doc, y, 'Date', format(new Date(), 'dd MMM yyyy'));
  y = addInfoRow(doc, y, 'Job Type', formData.job_type || '—');
  y = addInfoRow(doc, y, 'Fault Source', formData.fault_source || '—');
  y += 4;

  // Asset photo on cover
  if (assetImg) {
    const maxPhotoW = 100;
    const maxPhotoH = 70;
    const ratio = Math.min(maxPhotoW / assetImg.width, maxPhotoH / assetImg.height);
    const imgW = assetImg.width * ratio;
    const imgH = assetImg.height * ratio;
    const imgX = (pageW - imgW) / 2;
    doc.addImage(assetImg, 'JPEG', imgX, y, imgW, imgH);
    y += imgH + 6;
  }

  // Arrival Assessment
  y = addSectionTitle(doc, y, 'Arrival Assessment');
  y = addInfoRow(doc, y, 'Status on Arrival', formData.asset_status_on_arrival || '—');
  y = addInfoRow(doc, y, 'Urgency', formData.urgency_assessment || '—');
  if (formData.customer_reported_issue) {
    y = addInfoRow(doc, y, 'Customer Reported Issue', '');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.customer_reported_issue, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }
  if (formData.arrival_status_comment) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.arrival_status_comment, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }
  y += 2;

  // Work Completed
  y = checkPageBreak(doc, y, 40, imgs, 'Repair & Breakdown Report');
  y = addSectionTitle(doc, y, 'Work Completed');
  y = addInfoRow(doc, y, 'Type', formData.work_completed_type || '—');

  if (formData.work_comment) {
    y = checkPageBreak(doc, y, 20, imgs, 'Repair & Breakdown Report');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Comment & Recommendation:', 18, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.work_comment, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }

  if (formData.diagnosis_summary) {
    y = checkPageBreak(doc, y, 20, imgs, 'Repair & Breakdown Report');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Diagnosis Summary:', 18, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.diagnosis_summary, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }

  if (formData.recommendation) {
    y = checkPageBreak(doc, y, 16, imgs, 'Repair & Breakdown Report');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Recommendation:', 18, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.recommendation, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }

  if (formData.no_access_reason) {
    y = checkPageBreak(doc, y, 16, imgs, 'Repair & Breakdown Report');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Reason for No Access:', 18, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.no_access_reason, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }

  // Parts Replaced
  if (formData.parts_replaced && formData.parts_data.length > 0) {
    y = checkPageBreak(doc, y, 30, imgs, 'Repair & Breakdown Report');
    y = addSectionTitle(doc, y, 'Parts Replaced');
    const partRows = formData.parts_data.map(p => [p.name, String(p.quantity), p.part_number || '—']);
    autoTable(doc, {
      startY: y,
      head: [['Part Name', 'Qty', 'Part Number']],
      body: partRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Functional Testing
  if (formData.functional_testing_completed) {
    y = checkPageBreak(doc, y, 20, imgs, 'Repair & Breakdown Report');
    y = addSectionTitle(doc, y, 'Functional Testing');
    y = addInfoRow(doc, y, 'Completed', formData.functional_testing_completed);

    if (formData.functional_testing_completed === 'Yes' && formData.functional_testing_checklist.length > 0) {
      formData.functional_testing_checklist.forEach(item => {
        y = checkPageBreak(doc, y, 6, imgs, 'Repair & Breakdown Report');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        doc.text(`✓ ${item}`, 22, y);
        y += 5;
      });
      y += 2;
    }

    if (formData.functional_testing_completed === 'No' && formData.functional_testing_explanation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(formData.functional_testing_explanation, contentW - 8);
      doc.text(lines, 18, y);
      y += lines.length * 4 + 4;
    }
  }

  // Follow-up
  if (formData.followup_required) {
    y = checkPageBreak(doc, y, 16, imgs, 'Repair & Breakdown Report');
    y = addSectionTitle(doc, y, 'Follow-up Required');
    y = addInfoRow(doc, y, 'Follow-up Date', formData.followup_date ? format(new Date(formData.followup_date), 'dd MMM yyyy') : 'TBC');
    y += 4;
  }

  // Return to Service
  y = checkPageBreak(doc, y, 20, imgs, 'Repair & Breakdown Report');
  y = addSectionTitle(doc, y, 'Return to Service');
  y = addInfoRow(doc, y, 'Status', formData.return_to_service || '—');

  if (formData.return_to_service_explanation) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(formData.return_to_service_explanation, contentW - 8);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 4;
  }

  // Urgency banner
  if (formData.urgency_assessment === 'Immediate – Unsafe') {
    y = checkPageBreak(doc, y, 14, imgs, 'Repair & Breakdown Report');
    doc.setFillColor(255, 240, 240);
    doc.roundedRect(14, y, contentW, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...RKA_RED);
    doc.text('⚠ IMMEDIATE — UNSAFE CONDITION IDENTIFIED', 18, y + 6);
    y += 14;
  }

  // Standards reference
  y = checkPageBreak(doc, y, 16, imgs, 'Repair & Breakdown Report');
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(14, y, contentW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Australian Standards Reference: AS 2550 – Safe Use of Cranes | AS 1418 – Cranes, Hoists & Winches', 18, y + 5);
  doc.text('This report has been prepared in accordance with applicable Australian Standards.', 18, y + 9);

  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  return doc;
}
