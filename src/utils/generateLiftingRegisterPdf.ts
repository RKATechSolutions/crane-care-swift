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
  id?: string;
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
  overall_photo_url: string | null;
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

async function loadRemoteImage(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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

  // Group items the same way as the register list
  const groupedItems: { groupName: string; groupItems: RegisterItem[] }[] = [];
  if (hasGroups) {
    const groupMap: Record<string, RegisterItem[]> = {};
    items.forEach(item => {
      const gName = findGroup(item, categoryGroups);
      if (!groupMap[gName]) groupMap[gName] = [];
      groupMap[gName].push(item);
    });
    // Order: defined groups first, then Other
    const groupOrder = categoryGroups.map(g => g.name);
    const allGroupNames = Object.keys(groupMap);
    const orderedNames = [...groupOrder.filter(n => allGroupNames.includes(n)), ...allGroupNames.filter(n => !groupOrder.includes(n))];
    orderedNames.forEach(name => {
      groupedItems.push({ groupName: name, groupItems: groupMap[name] });
    });
  } else {
    groupedItems.push({ groupName: 'All Equipment', groupItems: items });
  }

  // Pre-load item photos (small batch)
  const photoCache: Record<string, string> = {};
  for (const item of items) {
    if (item.overall_photo_url) {
      // Base64 images can be used directly; external URLs need fetching
      if (item.overall_photo_url.startsWith('data:')) {
        photoCache[item.id || item.asset_tag || ''] = item.overall_photo_url;
      } else {
        const dataUrl = await loadRemoteImage(item.overall_photo_url);
        if (dataUrl) photoCache[item.id || item.asset_tag || ''] = dataUrl;
      }
    }
  }

  // Render grouped tables
  for (const { groupName, groupItems } of groupedItems) {
    // Group header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(`${groupName} (${groupItems.length})`, 14, y + 4);
    y += 7;

    const head = [
      'Photo', 'Type', 'Serial No.', 'WLL', 'Manufacturer', 'Model', 'Status', 'Details', 'Notes', 'Date',
    ];

    const rows = groupItems.map(item => {
      const dynamicDetails = buildDynamicFields(item);
      const itemKey = (item as any).id || item.asset_tag || '';
      return [
        photoCache[itemKey] ? '' : '—', // placeholder; actual image drawn in didDrawCell
        item.equipment_type,
        item.serial_number || '—',
        item.wll_value ? `${item.wll_value} ${item.wll_unit || 'kg'}` : '—',
        item.manufacturer || '—',
        item.model || '—',
        item.equipment_status || '—',
        dynamicDetails || '—',
        item.notes || '',
        format(new Date(item.created_at), 'dd/MM/yy'),
      ];
    });

    const statusColIdx = 6; // Updated index for 'Status'
    const tagColIdx = -1; // 'Tag?' column removed

    autoTable(doc, {
      startY: y,
      head: [head],
      body: rows,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', minCellHeight: 22 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 20 }, // Photo column
        1: { cellWidth: 25 }, // Type column
        7: { cellWidth: 40 }, // Details column
        8: { cellWidth: 65 }, // Notes column (widest for wrapping)
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
      didDrawCell(data) {
        // Draw photo in first column
        if (data.section === 'body' && data.column.index === 0) {
          const item = groupItems[data.row.index];
          const itemKey = (item as any).id || item.asset_tag || '';
          const photoUrl = photoCache[itemKey];
          if (photoUrl) {
            try {
              const cellX = data.cell.x + 0.5;
              const cellY = data.cell.y + 0.5;
              const imgSize = Math.min(data.cell.width - 1, data.cell.height - 1, 20);
              const imgFormat = photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
              doc.addImage(photoUrl, imgFormat, cellX, cellY, imgSize, imgSize);
            } catch { /* skip failed image */ }
          }
        }
      },
    });

    y = (doc as any).previousAutoTable?.finalY + 6 || y + 20;

    // Check if we need a new page for next group
    if (y > pageH - 30) {
      doc.addPage();
      y = 15;
    }
  }

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
