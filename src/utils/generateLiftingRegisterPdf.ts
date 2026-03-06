import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import rkaLogoUrl from '@/assets/rka-main-logo.png';

const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_RED: [number, number, number] = [204, 41, 41];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];

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
  sling_configuration: string | null;
  sling_leg_count: number | null;
  lift_height_m: number | null;
  span_m: number | null;
}

interface CategoryGroup {
  name: string;
  types: string[];
  fields: string[];
}

interface LiftingRegisterPdfData {
  siteName: string;
  clientName: string;
  technicianName: string;
  items: RegisterItem[];
  categoryGroups?: CategoryGroup[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function findGroup(item: RegisterItem, groups: CategoryGroup[]): string {
  const itemLower = item.equipment_type.toLowerCase().trim();
  let match = groups.find(g => g.types.some(t => t.toLowerCase().trim() === itemLower));
  if (!match) {
    match = groups.find(g =>
      g.types.some(t => {
        const tLower = t.toLowerCase().trim();
        return itemLower.includes(tLower) || tLower.includes(itemLower);
      }) || g.name.toLowerCase().includes(itemLower)
    );
  }
  return match?.name || 'Other';
}

function buildDynamicFields(item: RegisterItem): string {
  const parts: string[] = [];
  if (item.sling_configuration) parts.push(`Config: ${item.sling_configuration}`);
  if (item.sling_leg_count) parts.push(`Legs: ${item.sling_leg_count}`);
  if (item.length_m) parts.push(`Length: ${item.length_m}m`);
  if (item.lift_height_m) parts.push(`Lift Height: ${item.lift_height_m}m`);
  if (item.span_m) parts.push(`Span: ${item.span_m}m`);
  if (item.grade) parts.push(`Grade: ${item.grade}`);
  return parts.join(' | ');
}

export async function generateLiftingRegisterPdf(data: LiftingRegisterPdfData): Promise<jsPDF> {
  const { siteName, clientName, technicianName, items, categoryGroups = [] } = data;
  const hasGroups = categoryGroups.length > 0;
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let logoImg: HTMLImageElement | undefined;
  try { logoImg = await loadImage(rkaLogoUrl); } catch { /* fallback */ }

  // Header
  let y = 4;
  if (logoImg) {
    const logoH = 16;
    const logoW = logoH * (logoImg.width / logoImg.height);
    doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, 4, logoW, logoH);
    y = 24;
  }

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
  const failed = items.filter(i => i.equipment_status === 'Failed' || i.equipment_status === 'Defect Noted').length;
  const other = items.length - inService - failed;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RKA_GREEN);
  doc.text(`In Service: ${inService}`, 14, y + 3);
  doc.setTextColor(...RKA_RED);
  doc.text(`Failed/Defect: ${failed}`, 60, y + 3);
  doc.setTextColor(100, 100, 100);
  doc.text(`Other: ${other}`, 105, y + 3);
  doc.setTextColor(...DARK);
  doc.text(`Total: ${items.length}`, 135, y + 3);
  y += 8;

  // Build table with group column and dynamic details
  const head = [
    ...(hasGroups ? ['Group'] : []),
    'Type', 'Tag/ID', 'Serial No.', 'WLL', 'Manufacturer', 'Model', 'Tag?', 'Status', 'Details', 'Notes', 'Date',
  ];

  const rows = items.map(item => {
    const dynamicDetails = buildDynamicFields(item);
    return [
      ...(hasGroups ? [findGroup(item, categoryGroups)] : []),
      item.equipment_type,
      item.asset_tag || '—',
      item.serial_number || '—',
      item.wll_value ? `${item.wll_value} ${item.wll_unit || 'kg'}` : '—',
      item.manufacturer || '—',
      item.model || '—',
      item.tag_present === 'true' ? 'Yes' : item.tag_present === 'false' ? 'NO' : item.tag_present || '—',
      item.equipment_status || '—',
      dynamicDetails || '—',
      item.notes || '',
      format(new Date(item.created_at), 'dd/MM/yy'),
    ];
  });

  // Sort by group then asset tag
  if (hasGroups) {
    rows.sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
  }

  const statusColIdx = hasGroups ? 8 : 7;
  const tagColIdx = hasGroups ? 7 : 6;

  autoTable(doc, {
    startY: y,
    head: [head],
    body: rows,
    margin: { left: 10, right: 10 },
    styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 6 },
    columnStyles: {
      ...(hasGroups ? { 0: { cellWidth: 22 } } : {}),
      [hasGroups ? 9 : 8]: { cellWidth: 38 }, // Details column
      [hasGroups ? 10 : 9]: { cellWidth: 28 }, // Notes column
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === statusColIdx) {
        const val = data.cell.raw as string;
        if (val === 'In Service') {
          data.cell.styles.textColor = RKA_GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Failed' || val === 'Defect Noted' || val === 'Out of Service') {
          data.cell.styles.textColor = RKA_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === tagColIdx) {
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

  // Page numbers
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
