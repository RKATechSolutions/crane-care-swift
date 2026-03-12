import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Inspection, InspectionTemplate, Site, SiteJobSummary, Crane,
} from '@/types/inspection';
import { sortAssetsNumerically } from '@/utils/sorting';
import rkaLogoUrl from '@/assets/rka-main-logo.png';

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      // Try parsing common string formats if raw date fails
      return '—';
    }
    return format(d, formatStr);
  } catch (err) {
    console.warn('PDF Date formatting error:', err);
    return '—';
  }
};

interface DbInspectionPdf {
  id: string;
  asset_name: string | null;
  site_name: string | null;
  status: string;
  inspection_date: string;
  form_id: string;
  crane_status: string | null;
  technician_name: string;
}

interface DbDefectPdf {
  responseId: string;
  inspectionId: string;
  questionText: string;
  assetName: string;
  severity: string | null;
  urgency: string | null;
  defectTypes: string[];
  comment: string | null;
  photoUrls: string[];
  advancedDefectDetail: string[];
  quoteStatus?: 'Quote Now' | 'Quote Later';
  customerComment?: string;
  quoteInstructions?: string;
}

interface JobPdfData {
  site: Site;
  clientInfo?: {
    client_name: string;
    location_address?: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    primary_contact_mobile?: string;
  };
  technicianName: string;
  jobType: string;
  inspections: Inspection[];
  template: InspectionTemplate;
  summary: SiteJobSummary;
  customerDefectComments?: string;
  liftingDefects?: {
    equipment_type: string;
    serial_number: string | null;
    asset_tag: string | null;
    wll_value: number | null;
    wll_unit: string | null;
    equipment_status: string | null;
    tag_present: string | null;
    manufacturer: string | null;
    notes: string | null;
    quoteStatus?: string;
  }[];
  dbInspections?: DbInspectionPdf[];
  dbDefects?: DbDefectPdf[];
  servicePackage?: string;
}

// RKA brand colours
const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];
const RKA_YELLOW: [number, number, number] = [230, 184, 13];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];

interface PdfImages {
  logoImg?: HTMLImageElement;
}

function severityColor(severity: string): [number, number, number] {
  if (severity === 'Critical') return RKA_RED;
  if (severity === 'Major') return RKA_ORANGE;
  return RKA_YELLOW;
}

function statusColor(status: string): [number, number, number] {
  if (status === 'Crane is Operational') return RKA_GREEN;
  if (status === 'Unsafe to Operate') return RKA_RED;
  return RKA_ORANGE;
}

function addHeader(doc: jsPDF, pageTitle: string, imgs: PdfImages) {
  const pageW = doc.internal.pageSize.getWidth();

  try {
    if (imgs.logoImg && imgs.logoImg.complete && imgs.logoImg.naturalWidth > 0) {
      const logoH = 16;
      const aspect = imgs.logoImg.naturalWidth / imgs.logoImg.naturalHeight;
      const logoW = logoH * aspect;
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
  } catch (err) {
    console.error('Header Logo Error:', err);
  }

  // Fallback Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
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
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' });
  doc.text(`Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, pageH - 6);

  if (pageNum === 1) {
    doc.setFont('helvetica', 'italic');
    doc.text('Australian Standards Reference: AS 2550 – Safe Use of Cranes | AS 1418 – Cranes, Hoists & Winches | AS 4991 – Lifting Devices', 14, pageH - 12);
  }
}

function addSectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number] = RKA_GREEN): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
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
  const valX = maxWidth ? 18 : 80;
  if (maxWidth) {
    doc.text(value || '—', 18, y + 5, { maxWidth: maxWidth });
    return y + 10;
  }
  doc.text(value || '—', valX, y);
  return y + 6;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load image:', src);
      reject(new Error('Image load failed'));
    };
    img.src = src;
  });
}

export async function generateJobPdf(data: JobPdfData): Promise<jsPDF> {
  console.log('PDF Generation Started');
  const { site, clientInfo, technicianName, jobType, inspections, template, summary, liftingDefects, dbInspections, dbDefects, servicePackage } = data;
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  // Load logo
  const imgs: PdfImages = {};
  try { 
    imgs.logoImg = await loadImage(rkaLogoUrl); 
  } catch (err) { 
    console.warn('Logo load skipped'); 
  }
  
  // PAGE 1: CLIENT INFO & SERVICE DETAILS
  let y = addHeader(doc, 'Service Report', imgs);
  
  y = addSectionTitle(doc, y, 'Client Information');
  y = addInfoRow(doc, y, 'Business Name', clientInfo?.client_name || site.name);
  y = addInfoRow(doc, y, 'Address', clientInfo?.location_address || site.address);
  if (servicePackage) {
    y = addInfoRow(doc, y, 'Service Package', servicePackage);
  }
  y += 4;
  
  y = addSectionTitle(doc, y, 'Service Details');
  y = addInfoRow(doc, y, 'Job Type', jobType);
  y = addInfoRow(doc, y, 'Technician', technicianName);
  y = addInfoRow(doc, y, 'Service Date', format(new Date(), 'dd MMM yyyy'));
  y = addInfoRow(doc, y, 'Next Inspection Due', `${safeFormat(summary.nextInspectionDate, 'dd MMM yyyy')} at ${summary.nextInspectionTime || '09:00'}`);
  y = addInfoRow(doc, y, 'Booking Confirmed', summary.bookingConfirmed ? 'Yes ✓' : 'No');
  y += 4;
  
  y = addSectionTitle(doc, y, 'Assets Inspected');
  
  const useDbInspections = dbInspections && dbInspections.length > 0;
  let assetRows: string[][] = [];
  
  try {
    if (useDbInspections) {
      assetRows = sortAssetsNumerically(dbInspections!, 'asset_name').map(insp => {
        const defectCount = dbDefects ? dbDefects.filter(d => d.inspectionId === insp.id).length : 0;
        return [
          insp.asset_name || 'Unknown',
          template?.craneType || 'Overhead Crane',
          safeFormat(insp.inspection_date, 'dd MMM yyyy'),
          defectCount > 0 ? `${defectCount}` : '0',
          insp.crane_status || '—',
        ];
      });
    } else {
      assetRows = sortAssetsNumerically(inspections.map(i => ({ ...i, craneName: site.cranes.find(c => c.id === i.craneId)?.name })), 'craneName').map(insp => {
        const crane = site.cranes.find(c => c.id === insp.craneId);
        const defectCount = insp.items.filter(i => i.result === 'defect').length;
        return [
          crane?.name || 'Unknown',
          crane?.type || '',
          safeFormat(insp.completedAt || new Date(), 'dd MMM yyyy'),
          defectCount > 0 ? `${defectCount}` : '0',
          insp.craneStatus || '—',
        ];
      });
    }

    autoTable(doc, {
      startY: y,
      head: [useDbInspections ? ['Asset Name', 'Form', 'Date', 'Defects', 'Status'] : ['Asset Name', 'Type', 'Date', 'Defects', 'Status']],
      body: assetRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      didParseCell(cellData) {
        if (cellData.section === 'body' && cellData.column.index === 4) {
          const val = cellData.cell.raw as string;
          if (val === 'Crane is Operational') cellData.cell.styles.textColor = RKA_GREEN;
          else if (val === 'Unsafe to Operate') cellData.cell.styles.textColor = RKA_RED;
        }
      }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } catch (err) {
    console.error('Assets Table Error:', err);
    y += 10;
  }
  
  // PAGE 2: JOB SITE SUMMARY (DEFECTS)
  doc.addPage();
  y = addHeader(doc, 'Job Summary — Defects', imgs);
  
  const hasDbDefectsData = dbDefects && dbDefects.length > 0;
  
  if (hasDbDefectsData) {
    const quoteNowDb = dbDefects!.filter(d => d.quoteStatus === 'Quote Now');
    const quoteLaterDb = dbDefects!.filter(d => d.quoteStatus === 'Quote Later');
    const uncategorizedDb = dbDefects!.filter(d => !d.quoteStatus);

    const mappedLifting = (liftingDefects || []).map(ld => ({
      assetName: ld.equipment_type,
      questionText: `Serial/Tag: ${ld.serial_number || ld.asset_tag || '—'}`,
      severity: ld.equipment_status === 'Failed' ? 'Critical' : 'Major',
      defectTypes: [],
      comment: ld.notes || '',
      photoUrls: [],
      quoteStatus: ld.quoteStatus as any
    }));

    const finalFixNow = (quoteNowDb as any[]).concat(uncategorizedDb).concat(mappedLifting.filter(l => l.quoteStatus === 'Quote Now' || !l.quoteStatus));
    const finalQuoteLater = (quoteLaterDb as any[]).concat(mappedLifting.filter(l => l.quoteStatus === 'Quote Later'));

    const renderDefectTable = (defects: any[], title: string, bannerColor: [number, number, number], decisionText: string) => {
      if (defects.length === 0) return;
      if (y > 230) { doc.addPage(); y = addHeader(doc, title, imgs); }
      y = addSectionTitle(doc, y, title, bannerColor);
      
      try {
        autoTable(doc, {
          startY: y,
          head: [['Asset', 'Defect Description & Notes', 'Severity', 'Decision', 'Photos']],
          body: defects.map(d => [d.assetName, `${d.questionText}\n${d.comment || ''}`, d.severity || 'Minor', decisionText, '']),
          margin: { left: 14, right: 14 },
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: bannerColor, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
          columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 65 }, 2: { cellWidth: 15 }, 3: { cellWidth: 20 }, 4: { cellWidth: 50} },
          didParseCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 3) {
              cellData.cell.styles.fontStyle = 'bold';
              if (decisionText === 'Fix Now') {
                cellData.cell.styles.textColor = RKA_GREEN;
              } else if (decisionText === 'Quote Later') {
                cellData.cell.styles.textColor = [0, 0, 0];
              }
            }
          },
          didDrawCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 4) {
              const defect = defects[cellData.row.index];
              if (defect.photoUrls?.length > 0) {
                let px = cellData.cell.x + 2;
                let py = cellData.cell.y + 2;
                defect.photoUrls.slice(0, 3).forEach((url: string) => {
                  try { if (url) doc.addImage(url, 'JPEG', px, py, 15, 15, undefined, 'FAST'); px += 17; } catch {}
                });
              }
            }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } catch (err) { console.error('Defect Table Error:', err); y += 10; }
    };

    renderDefectTable(finalFixNow, `Fix Now Defects (${finalFixNow.length})`, RKA_GREEN, 'Fix Now');
    renderDefectTable(finalQuoteLater, `Quote Later Defects (${finalQuoteLater.length})`, DARK, 'Quote Later');
  } else {
    y = addSectionTitle(doc, y, 'Defects Found');
    doc.text('No critical crane defects reported.', 18, y + 4);
    y += 10;
  }

  // INDIVIDUAL ASSET REPORTS
  for (const insp of inspections) {
    doc.addPage();
    const crane = site.cranes.find(c => c.id === insp.craneId);
    y = addHeader(doc, `Asset Report — ${crane?.name || 'Unknown'}`, imgs);
    
    y = addSectionTitle(doc, y, 'Asset Details');
    y = addInfoRow(doc, y, 'Asset Name', crane?.name || '—');
    y = addInfoRow(doc, y, 'Form Type', template?.craneType || 'Overhead Crane');
    y += 6;

    if (insp.craneStatus) {
      const sColor = statusColor(insp.craneStatus);
      doc.setFillColor(...sColor);
      doc.rect(14, y, contentW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(insp.craneStatus.toUpperCase(), pageW / 2, y + 5.5, { align: 'center' });
      y += 14;
    }

    template.sections.forEach(section => {
      const sectionResults = insp.items.filter(i => i.sectionId === section.id);
      if (sectionResults.length === 0) return;
      if (y > 250) { doc.addPage(); y = addHeader(doc, `Asset Report — ${crane?.name || 'Unknown'}`, imgs); }
      y = addSectionTitle(doc, y, section.name);
      
      try {
        autoTable(doc, {
          startY: y,
          head: [['Item', 'Result', 'Notes']],
          body: sectionResults.map(item => {
            const tmplItem = section.items.find(ti => ti.id === item.templateItemId);
            return [tmplItem?.label || '—', item.selectedValue || (item.result === 'pass' ? 'Pass' : 'Defect'), item.comment || ''];
          }),
          margin: { left: 14, right: 14 },
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 }
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      } catch {}
    });
  }

  // FINAL PAGE: SIGN-OFF
  if (y > 210) {
    doc.addPage();
    y = addHeader(doc, 'Signatures', imgs);
  } else {
    y += 10;
  }



  y = addSectionTitle(doc, y, 'Signatures');
  const sigY = y + 4;
  
  try {
    const boxW = (contentW - 10) / 2;
    doc.setDrawColor(...BORDER_GRAY);
    
    // Customer Box
    doc.rect(14, sigY, boxW, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text('CUSTOMER SIGNATURE', 16, sigY + 6);
    if (summary.customerSignature) doc.addImage(summary.customerSignature, 'PNG', 16, sigY + 8, boxW-4, 18);
    doc.setFont('helvetica', 'normal');
    doc.text(summary.customerName || '—', 16, sigY + 32);

    // Technician Box
    doc.rect(pageW - 14 - boxW, sigY, boxW, 35);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNICIAN SIGNATURE', pageW - boxW - 12, sigY + 6);
    if (summary.technicianSignature) doc.addImage(summary.technicianSignature, 'PNG', pageW - boxW - 12, sigY + 8, boxW-4, 18);
    doc.setFont('helvetica', 'normal');
    doc.text(technicianName, pageW - boxW - 12, sigY + 32);
  } catch (err) { console.warn('Sign-off render error'); }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  console.log('PDF Generation Complete');
  return doc;
}
