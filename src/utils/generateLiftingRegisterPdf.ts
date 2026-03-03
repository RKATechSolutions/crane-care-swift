import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import rkaLogoUrl from '@/assets/rka-main-logo.png';
import rkaFooterUrl from '@/assets/rka-pdf-footer.png';

const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_RED: [number, number, number] = [204, 41, 41];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];

interface RegisterItem {
  equipment_type: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  wll_value: number | null;
  wll_unit: string | null;
  length_m: number | null;
  grade: string | null;
  tag_present: string | null;
  equipment_status: string | null;
  notes: string | null;
  registered_by_name: string;
  created_at: string;
}

interface LiftingRegisterPdfData {
  siteName: string;
  clientName: string;
  technicianName: string;
  items: RegisterItem[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateLiftingRegisterPdf(data: LiftingRegisterPdfData): Promise<jsPDF> {
  const { siteName, clientName, technicianName, items } = data;
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape for more columns
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let headerImg: HTMLImageElement | undefined;
  let footerImg: HTMLImageElement | undefined;
  try { headerImg = await loadImage(rkaHeaderUrl); } catch { /* fallback */ }
  try { footerImg = await loadImage(rkaFooterUrl); } catch { /* fallback */ }

  // Header
  let y = 4;
  if (headerImg) {
    const imgAspect = headerImg.width / headerImg.height;
    const headerH = pageW / imgAspect;
    doc.addImage(headerImg, 'PNG', 0, 0, pageW, headerH);
    y = headerH + 4;
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text('LIFTING EQUIPMENT REGISTER', 14, y + 6);
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Client: ${clientName}  |  Site: ${siteName}  |  Technician: ${technicianName}  |  Date: ${format(new Date(), 'dd MMM yyyy')}`, 14, y + 4);
  y += 10;

  // Summary counts
  const inService = items.filter(i => i.equipment_status === 'In Service').length;
  const failed = items.filter(i => i.equipment_status === 'Failed').length;
  const other = items.length - inService - failed;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RKA_GREEN);
  doc.text(`In Service: ${inService}`, 14, y + 3);
  doc.setTextColor(...RKA_RED);
  doc.text(`Failed: ${failed}`, 60, y + 3);
  doc.setTextColor(100, 100, 100);
  doc.text(`Other: ${other}`, 95, y + 3);
  doc.setTextColor(...DARK);
  doc.text(`Total: ${items.length}`, 125, y + 3);
  y += 8;

  // Table
  const rows = items.map(item => [
    item.equipment_type,
    item.serial_number || '—',
    item.asset_tag || '—',
    item.wll_value ? `${item.wll_value} ${item.wll_unit || 'kg'}` : '—',
    item.manufacturer || '—',
    item.model || '—',
    item.grade || '—',
    item.length_m ? `${item.length_m}m` : '—',
    item.tag_present === 'true' ? 'Yes' : item.tag_present === 'false' ? 'NO' : item.tag_present || '—',
    item.equipment_status || '—',
    item.notes || '',
    format(new Date(item.created_at), 'dd/MM/yy'),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Type', 'Serial No.', 'Tag/ID', 'WLL', 'Manufacturer', 'Model', 'Grade', 'Length', 'Tag?', 'Status', 'Notes', 'Date']],
    body: rows,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 28 },
      10: { cellWidth: 35 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 9) {
        const val = data.cell.raw as string;
        if (val === 'In Service') {
          data.cell.styles.textColor = RKA_GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Failed') {
          data.cell.styles.textColor = RKA_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === 8) {
        const val = data.cell.raw as string;
        if (val === 'NO') {
          data.cell.styles.textColor = RKA_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.row.index % 2 === 0) {
        data.cell.styles.fillColor = LIGHT_GRAY;
      }
    },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (footerImg) {
      const imgAspect = footerImg.width / footerImg.height;
      const footerH = pageW / imgAspect;
      doc.addImage(footerImg, 'PNG', 0, pageH - footerH, pageW, footerH);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - footerH - 3, { align: 'center' });
    } else {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    }
  }

  return doc;
}
