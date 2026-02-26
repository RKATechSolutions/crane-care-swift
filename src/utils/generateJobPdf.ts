import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  Inspection, InspectionTemplate, Site, SiteJobSummary, Crane,
} from '@/types/inspection';
import rkaLogoUrl from '@/assets/rka-logo.jpg';

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
}

// RKA brand colors (from Brand Guidelines)
const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_RED: [number, number, number] = [204, 41, 41];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];
const RKA_YELLOW: [number, number, number] = [230, 184, 13];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const BORDER_GRAY: [number, number, number] = [220, 220, 220];

function severityColor(severity: string): [number, number, number] {
  if (severity === 'Critical') return RKA_RED;
  if (severity === 'Major') return RKA_ORANGE;
  return RKA_YELLOW;
}

function statusColor(status: string): [number, number, number] {
  if (status === 'Safe to Operate') return RKA_GREEN;
  if (status === 'Unsafe to Operate') return RKA_RED;
  return RKA_ORANGE;
}

function addHeader(doc: jsPDF, pageTitle: string, logoImg?: HTMLImageElement) {
  const pageW = doc.internal.pageSize.getWidth();
  
  // Dark header bar (brand black)
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 28, 'F');
  
  // Add logo if available
  if (logoImg) {
    const logoH = 14;
    const logoW = logoH * (logoImg.width / logoImg.height);
    doc.addImage(logoImg, 'JPEG', 14, 7, logoW, logoH);
  }
  
  // Page title on right
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(pageTitle, pageW - 14, 16, { align: 'right' });
  
  // Thin line below
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageW - 14, 30);
  
  return 34; // y position after header
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  
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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateJobPdf(data: JobPdfData): Promise<jsPDF> {
  const { site, clientInfo, technicianName, jobType, inspections, template, summary, customerDefectComments } = data;
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  let logoImg: HTMLImageElement | undefined;
  try {
    logoImg = await loadImage(rkaLogoUrl);
  } catch { /* proceed without logo */ }
  
  // ═══════════════════════════════════════════
  // PAGE 1: CLIENT INFO & SERVICE DETAILS
  // ═══════════════════════════════════════════
  let y = addHeader(doc, 'Service Report', logoImg);
  
  // Client Information
  y = addSectionTitle(doc, y, 'Client Information');
  y = addInfoRow(doc, y, 'Client Name', clientInfo?.client_name || site.name);
  y = addInfoRow(doc, y, 'Site Address', clientInfo?.location_address || site.address);
  y = addInfoRow(doc, y, 'Primary Contact', clientInfo?.primary_contact_name || site.contactName);
  if (clientInfo?.primary_contact_email) {
    y = addInfoRow(doc, y, 'Email', clientInfo.primary_contact_email);
  }
  if (clientInfo?.primary_contact_mobile) {
    y = addInfoRow(doc, y, 'Mobile', clientInfo.primary_contact_mobile);
  }
  y += 4;
  
  // Service Details
  y = addSectionTitle(doc, y, 'Service Details');
  y = addInfoRow(doc, y, 'Job Type', jobType);
  y = addInfoRow(doc, y, 'Technician', technicianName);
  y = addInfoRow(doc, y, 'Service Date', format(new Date(), 'dd MMM yyyy'));
  y = addInfoRow(doc, y, 'Next Service Due', format(new Date(summary.nextInspectionDate), 'dd MMM yyyy'));
  y = addInfoRow(doc, y, 'Booking Confirmed', summary.bookingConfirmed ? 'Yes ✓' : 'No');
  y += 4;
  
  // Assets Inspected
  y = addSectionTitle(doc, y, 'Assets Inspected');
  
  const assetRows = inspections.map(insp => {
    const crane = site.cranes.find(c => c.id === insp.craneId);
    const defectCount = insp.items.filter(i => i.result === 'defect').length;
    const passCount = insp.items.filter(i => i.result === 'pass').length;
    return [
      crane?.name || 'Unknown',
      crane?.type || '',
      crane?.serialNumber || '',
      crane?.capacity || '',
      `${passCount}/${insp.items.length}`,
      defectCount > 0 ? `${defectCount}` : '0',
      insp.craneStatus || '—',
    ];
  });
  
  autoTable(doc, {
    startY: y,
    head: [['Asset Name', 'Type', 'Serial No.', 'Capacity', 'Passed', 'Defects', 'Status']],
    body: assetRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    didParseCell(data) {
      // Color the status column
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.raw as string;
        if (val === 'Safe to Operate') data.cell.styles.textColor = RKA_GREEN;
        else if (val === 'Unsafe to Operate') data.cell.styles.textColor = RKA_RED;
        else if (val.includes('Limitations')) data.cell.styles.textColor = RKA_ORANGE;
      }
      // Color defect count
      if (data.section === 'body' && data.column.index === 5) {
        const val = parseInt(data.cell.raw as string);
        if (val > 0) {
          data.cell.styles.textColor = RKA_RED;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  
  y = (doc as any).lastAutoTable.finalY + 8;
  
  // Australian Standards reference
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(14, y, contentW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Australian Standards Reference: AS 2550 – Safe Use of Cranes | AS 1418 – Cranes, Hoists & Winches | AS 4991 – Lifting Devices', 18, y + 5);
  doc.text('This report has been prepared in accordance with applicable Australian Standards for crane inspection and lifting operations.', 18, y + 9);
  
  // ═══════════════════════════════════════════
  // PAGE 2: JOB SITE SUMMARY (DEFECTS + SIGN-OFF)
  // ═══════════════════════════════════════════
  doc.addPage();
  y = addHeader(doc, 'Job Summary — Defects & Sign-off', logoImg);
  
  // Gather all defects
  const allDefects = inspections.flatMap(insp => {
    const crane = site.cranes.find(c => c.id === insp.craneId);
    return insp.items
      .filter(i => (i.result === 'defect') && i.defect)
      .map(item => {
        let itemLabel = '';
        for (const sec of template.sections) {
          const found = sec.items.find(ti => ti.id === item.templateItemId);
          if (found) { itemLabel = found.label; break; }
        }
        return { crane, item, itemLabel };
      });
  });
  
  if (allDefects.length > 0) {
    y = addSectionTitle(doc, y, `Defects Found (${allDefects.length})`);
    
    const defectRows = allDefects.map(({ crane, item, itemLabel }) => [
      crane?.name || '',
      itemLabel,
      item.defect!.severity,
      item.defect!.defectType,
      item.defect!.rectificationTimeframe,
      item.defect!.notes || '—',
      item.defect!.quoteStatus || '—',
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Asset', 'Item', 'Severity', 'Type', 'Timeframe', 'Notes', 'Quote']],
      body: defectRows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35 },
        5: { cellWidth: 35 },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.raw as string;
          data.cell.styles.textColor = severityColor(val);
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 4;
    
    // Customer comments on defects
    if (customerDefectComments) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('CUSTOMER COMMENTS ON DEFECTS:', 18, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      const lines = doc.splitTextToSize(customerDefectComments, contentW - 8);
      doc.text(lines, 18, y);
      y += lines.length * 4 + 4;
    }
  } else {
    y = addSectionTitle(doc, y, 'Defects Found');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text('No defects found — all assets passed inspection.', 18, y + 4);
    y += 12;
  }
  
  // Recommendations section
  y = addSectionTitle(doc, y, 'Recommendations');
  
  const quoteNowItems = allDefects.filter(d => d.item.defect?.quoteStatus === 'Quote Now');
  const quoteLaterItems = allDefects.filter(d => d.item.defect?.quoteStatus === 'Quote Later');
  const criticalItems = allDefects.filter(d => d.item.defect?.severity === 'Critical');
  
  if (criticalItems.length > 0) {
    doc.setFillColor(255, 240, 240);
    doc.roundedRect(14, y, contentW, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...RKA_RED);
    doc.text(`⚠ ${criticalItems.length} CRITICAL defect${criticalItems.length > 1 ? 's' : ''} requiring immediate attention`, 18, y + 6);
    y += 14;
  }
  
  if (quoteNowItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...RKA_GREEN);
    doc.text(`✓ ${quoteNowItems.length} item${quoteNowItems.length > 1 ? 's' : ''} approved for quotation`, 18, y);
    y += 5;
    quoteNowItems.forEach(d => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text(`• ${d.crane?.name} — ${d.itemLabel}`, 22, y);
      y += 4;
    });
    y += 2;
  }
  
  if (quoteLaterItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${quoteLaterItems.length} item${quoteLaterItems.length > 1 ? 's' : ''} flagged for future quotation`, 18, y);
    y += 5;
    quoteLaterItems.forEach(d => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK);
      doc.text(`• ${d.crane?.name} — ${d.itemLabel}`, 22, y);
      y += 4;
    });
    y += 2;
  }
  
  if (allDefects.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text('All assets are in satisfactory condition. Continue regular scheduled inspections.', 18, y);
    y += 8;
  }
  
  // Next Service
  y += 4;
  y = addSectionTitle(doc, y, 'Next Service');
  y = addInfoRow(doc, y, 'Next Inspection Date', format(new Date(summary.nextInspectionDate), 'dd MMM yyyy'));
  y = addInfoRow(doc, y, 'Scheduled Time', summary.nextInspectionTime);
  y = addInfoRow(doc, y, 'Booking Confirmed', summary.bookingConfirmed ? 'Yes ✓' : 'Pending');
  y += 4;
  
  // Customer feedback
  if (summary.rating || summary.feedback) {
    y = addSectionTitle(doc, y, 'Customer Feedback');
    if (summary.rating) {
      const stars = '★'.repeat(summary.rating) + '☆'.repeat(5 - summary.rating);
      y = addInfoRow(doc, y, 'Rating', `${stars} (${summary.rating}/5)`);
    }
    if (summary.feedback) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const fbLines = doc.splitTextToSize(`"${summary.feedback}"`, contentW - 8);
      doc.text(fbLines, 18, y);
      y += fbLines.length * 4 + 4;
    }
    y += 4;
  }
  
  // Sign-off section
  y = addSectionTitle(doc, y, 'Sign-off');
  
  // Check if we need a new page for signatures
  if (y > 230) {
    doc.addPage();
    y = addHeader(doc, 'Sign-off', logoImg);
    y += 4;
  }
  
  // Signature boxes
  const sigBoxW = (contentW - 8) / 2;
  
  // Customer signature
  doc.setDrawColor(...BORDER_GRAY);
  doc.setLineWidth(0.3);
  doc.rect(14, y, sigBoxW, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('CUSTOMER SIGNATURE', 16, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(summary.customerName || '—', 16, y + 9);
  
  // Draw signature image if available
  if (summary.customerSignature) {
    try {
      doc.addImage(summary.customerSignature, 'PNG', 16, y + 11, sigBoxW - 4, 16, undefined, 'FAST');
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('[Signed electronically]', 16, y + 20);
    }
  }
  
  // Technician signature
  doc.rect(14 + sigBoxW + 8, y, sigBoxW, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('TECHNICIAN SIGNATURE', 14 + sigBoxW + 10, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(technicianName, 14 + sigBoxW + 10, y + 9);
  
  if (summary.technicianSignature) {
    try {
      doc.addImage(summary.technicianSignature, 'PNG', 14 + sigBoxW + 10, y + 11, sigBoxW - 4, 16, undefined, 'FAST');
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('[Signed electronically]', 14 + sigBoxW + 10, y + 20);
    }
  }
  
  y += 36;
  
  // Completion timestamp
  if (summary.completedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Report completed: ${format(new Date(summary.completedAt), 'dd MMM yyyy HH:mm')}`, 14, y);
  }
  
  // ═══════════════════════════════════════════
  // PAGES 3+: INDIVIDUAL ASSET REPORTS
  // ═══════════════════════════════════════════
  inspections.forEach(insp => {
    doc.addPage();
    const crane = site.cranes.find(c => c.id === insp.craneId);
    y = addHeader(doc, `Asset Report — ${crane?.name || 'Unknown'}`, logoImg);
    
    // Asset info
    y = addSectionTitle(doc, y, 'Asset Details');
    y = addInfoRow(doc, y, 'Asset Name', crane?.name || '—');
    y = addInfoRow(doc, y, 'Type', crane?.type || '—');
    y = addInfoRow(doc, y, 'Serial Number', crane?.serialNumber || '—');
    y = addInfoRow(doc, y, 'Capacity', crane?.capacity || '—');
    y = addInfoRow(doc, y, 'Manufacturer', crane?.manufacturer || '—');
    y = addInfoRow(doc, y, 'Year Installed', String(crane?.yearInstalled || '—'));
    y += 2;
    
    // Operational status
    if (insp.craneStatus) {
      const sColor = statusColor(insp.craneStatus);
      doc.setFillColor(...sColor);
      doc.roundedRect(14, y, contentW, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...WHITE);
      doc.text(insp.craneStatus.toUpperCase(), pageW / 2, y + 7, { align: 'center' });
      y += 14;
    }
    
    // Inspection results by section
    template.sections.forEach(section => {
      const sectionResults = insp.items.filter(i => i.sectionId === section.id);
      if (sectionResults.length === 0) return;
      
      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = addHeader(doc, `Asset Report — ${crane?.name || 'Unknown'} (cont.)`, logoImg);
      }
      
      y = addSectionTitle(doc, y, section.name);
      
      const rows = sectionResults.map(item => {
        const tmplItem = section.items.find(ti => ti.id === item.templateItemId);
        const itemType = tmplItem?.type || 'checklist';
        
        let resultText = '—';
        if (itemType === 'single_select') {
          resultText = item.selectedValue || '—';
        } else if (itemType === 'numeric') {
          resultText = item.numericValue !== undefined ? String(item.numericValue) : '—';
        } else {
          if (item.result === 'pass') resultText = 'Pass ✓';
          else if (item.result === 'defect') resultText = 'DEFECT';
          else if (item.result === 'unresolved') resultText = 'Unresolved';
        }
        
        let notes = '';
        if (item.comment) notes = item.comment;
        if (item.conditionalComment) notes = item.conditionalComment;
        if (item.defect?.notes) notes = item.defect.notes;
        
        return [
          tmplItem?.label || '—',
          resultText,
          notes,
        ];
      });
      
      autoTable(doc, {
        startY: y,
        head: [['Inspection Item', 'Result', 'Notes']],
        body: rows,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [60, 60, 60], textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: contentW - 95 - 4 },
        },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 1) {
            const val = data.cell.raw as string;
            if (val.includes('Pass')) {
              data.cell.styles.textColor = RKA_GREEN;
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'DEFECT') {
              data.cell.styles.textColor = RKA_RED;
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Unresolved') {
              data.cell.styles.textColor = RKA_ORANGE;
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Alternate row colors
          if (data.section === 'body' && data.row.index % 2 === 0) {
            data.cell.styles.fillColor = LIGHT_GRAY;
          }
        },
      });
      
      y = (doc as any).lastAutoTable.finalY + 4;
    });
    
    // Defect details for this asset
    const assetDefects = insp.items.filter(i => i.result === 'defect' && i.defect);
    if (assetDefects.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = addHeader(doc, `Asset Report — ${crane?.name || 'Unknown'} (Defects)`, logoImg);
      }
      
      y = addSectionTitle(doc, y, `Defect Details (${assetDefects.length})`);
      
      assetDefects.forEach(item => {
        if (y > 250) {
          doc.addPage();
          y = addHeader(doc, `Asset Report — ${crane?.name || 'Unknown'} (Defects cont.)`, logoImg);
        }
        
        let itemLabel = '';
        for (const sec of template.sections) {
          const found = sec.items.find(ti => ti.id === item.templateItemId);
          if (found) { itemLabel = found.label; break; }
        }
        
        // Defect card
        const sColor = severityColor(item.defect!.severity);
        doc.setDrawColor(...sColor);
        doc.setLineWidth(0.8);
        doc.rect(14, y, contentW, 1, 'F');
        doc.setFillColor(...sColor);
        y += 2;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        doc.text(itemLabel, 18, y + 3);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const detailText = `${item.defect!.severity} | ${item.defect!.defectType} | ${item.defect!.rectificationTimeframe}`;
        doc.text(detailText, 18, y + 7);
        
        if (item.defect!.notes) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          const noteLines = doc.splitTextToSize(item.defect!.notes, contentW - 8);
          doc.text(noteLines, 18, y + 11);
          y += 11 + noteLines.length * 3.5;
        } else {
          y += 10;
        }
        
        // Photos placeholder text (actual photos are base64 in production)
        const photos = item.defect?.photos || [];
        if (photos.length > 0) {
          // Try to embed photos
          let photoX = 18;
          const photoSize = 25;
          photos.slice(0, 3).forEach((photoUrl, idx) => {
            try {
              doc.addImage(photoUrl, 'JPEG', photoX, y, photoSize, photoSize, undefined, 'FAST');
              photoX += photoSize + 3;
            } catch {
              // Photo couldn't be embedded, show placeholder
              doc.setDrawColor(...BORDER_GRAY);
              doc.setFillColor(...LIGHT_GRAY);
              doc.roundedRect(photoX, y, photoSize, photoSize, 1, 1, 'FD');
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6);
              doc.setTextColor(150, 150, 150);
              doc.text(`Photo ${idx + 1}`, photoX + 5, y + 13);
              photoX += photoSize + 3;
            }
          });
          y += photoSize + 4;
        }
        
        y += 4;
      });
    }
  });
  
  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return doc;
}
