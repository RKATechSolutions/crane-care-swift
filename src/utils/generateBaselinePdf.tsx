import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import rkaLogoUrl from '@/assets/rka-main-logo.png';

interface BaselinePdfData {
  siteName: string;
  companyName: string;
  technicianName: string;
  formData: Record<string, string | number | null>;
  calculations: {
    annualDowntime: number;
    reactiveRatio: number;
    mttr: number;
    costPerBreakdown: number;
    annualCost: number;
    adjustedCost: number;
    trainingCoverage: number;
  };
}

const DARK: [number, number, number] = [40, 32, 39];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const RKA_GREEN: [number, number, number] = [96, 179, 76];
const RKA_ORANGE: [number, number, number] = [230, 126, 13];
const RKA_RED: [number, number, number] = [204, 41, 41];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fmtNum(v: number | null | undefined, prefix = '', suffix = ''): string {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return '—';
  return `${prefix}${v.toLocaleString('en-AU', { maximumFractionDigits: 1 })}${suffix}`;
}

export async function generateBaselinePdf(data: BaselinePdfData): Promise<jsPDF> {
  const { siteName, companyName, technicianName, formData, calculations } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let logoImg: HTMLImageElement | undefined;
  try { logoImg = await loadImage(rkaLogoUrl); } catch { /* skip */ }

  const addHeader = () => {
    if (logoImg) {
      const logoH = 16;
      const logoW = logoH * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, 'PNG', (pageW - logoW) / 2, 4, logoW, logoH);
    }
  };

  const str = (key: string): string => {
    const v = formData[key];
    return typeof v === 'string' ? v : (v !== null && v !== undefined ? String(v) : '—');
  };

  const numStr = (key: string, suffix = ''): string => {
    const v = formData[key];
    if (v === null || v === undefined || v === '') return '—';
    return `${v}${suffix}`;
  };

  // Cover page
  addHeader();
  let y = 30;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('RKA Crane Culture &', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.text('Performance Baseline', pageW / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName || siteName, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.text(`Technician: ${technicianName}`, pageW / 2, y, { align: 'center' });
  y += 6;
  doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, pageW / 2, y, { align: 'center' });
  y += 14;

  // Section helper
  const addSectionTitle = (title: string) => {
    if (y > pageH - 30) { doc.addPage(); addHeader(); y = 28; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(title, 15, y);
    y += 6;
  };

  const addTable = (rows: string[][]) => {
    autoTable(doc, {
      startY: y,
      body: rows,
      margin: { left: 15, right: 15, bottom: 14 },
      theme: 'grid',
      bodyStyles: { fontSize: 8, textColor: DARK },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      didDrawPage: () => addHeader(),
    });
    y = (doc as any).lastAutoTable?.finalY + 8 || y + 8;
  };

  // Section 1
  addSectionTitle('Site & Operations Overview');
  addTable([
    ['Company Name', str('company_name')],
    ['Site Location', str('site_location')],
    ['Main Contact', str('main_contact_name')],
    ['Role / Position', str('role_position')],
    ['Number of Cranes', numStr('number_of_cranes')],
    ['Operating Hours/Day', numStr('operating_hours_per_day')],
    ['Shifts/Day', numStr('shifts_per_day')],
    ['Days/Week', numStr('days_per_week')],
    ['Production Increased?', str('production_increased')],
  ]);

  // Section 2
  addSectionTitle('Breakdown & Downtime History');
  addTable([
    ['Breakdowns (12 Months)', numStr('breakdowns')],
    ['Avg Downtime/Breakdown', numStr('avg_downtime', ' hrs')],
    ['Longest Downtime', numStr('longest_downtime', ' hrs')],
    ['Avg Response Time', numStr('avg_response_time', ' hrs')],
    ['Scheduled Visits/Year', numStr('scheduled_visits')],
    ['Emergency Call-Outs/Year', numStr('emergency_visits')],
    ['First-Time Fix Rate', numStr('first_time_fix', '%')],
  ]);

  addSectionTitle('Calculated Metrics');
  addTable([
    ['Est. Annual Downtime', fmtNum(calculations.annualDowntime, '', ' hrs')],
    ['Reactive Maintenance Ratio', fmtNum(calculations.reactiveRatio, '', '%')],
    ['Mean Time To Repair', fmtNum(calculations.mttr, '', ' hrs')],
  ]);

  // Section 3
  addSectionTitle('Financial Downtime Impact');
  addTable([
    ['Revenue/Production Hour', numStr('rev_hour', '$')],
    ['Labour Cost/Downtime Hour', numStr('labour_cost_per_hour', '$')],
    ['Backup Crane Available', str('backup_crane')],
    ['Cost Per Breakdown', fmtNum(calculations.costPerBreakdown, '$')],
    ['Annual Downtime Cost', fmtNum(calculations.annualCost, '$')],
    ...(str('backup_crane') === 'No' ? [['Adjusted Cost (No Backup)', fmtNum(calculations.adjustedCost, '$')]] : []),
  ]);

  // Sections 4-9 as select-field tables
  const selectSections: { title: string; fields: [string, string][] }[] = [
    {
      title: 'Environment & Workplace Standards',
      fields: [
        ['Crane area cleanliness standard', 'cleanliness_standard'],
        ['Workshop tidy & organised', 'workshop_tidy'],
        ['Environmental factors managed', 'environmental_factors'],
        ['Crane hazards in safety meetings', 'crane_hazards_meetings'],
      ],
    },
    {
      title: 'Maintenance & Documentation',
      fields: [
        ['Breakdown response process', 'breakdown_response_process'],
        ['Preventative maintenance adhered to', 'preventative_maintenance'],
        ['Pre-start inspections completed', 'pre_start_inspections'],
        ['Logbooks updated', 'logbooks_updated'],
        ['Findings reviewed by management', 'findings_reviewed'],
        ['Defects tracked to close-out', 'defects_tracked'],
      ],
    },
    {
      title: 'Safety & Load Discipline',
      fields: [
        ['Walkways clear', 'walkways_clear'],
        ['Signage current & visible', 'signage_current'],
        ['PPE worn', 'ppe_worn'],
        ['Within rated capacity', 'within_capacity'],
        ['Lifting register maintained', 'lifting_register_maintained'],
        ['Load handling education', 'load_handling_education'],
        ['Complex lifts process', 'complex_lifts_process'],
      ],
    },
    {
      title: 'Education & Training',
      fields: [
        ['Total Crane Operators', 'total_operators'],
        ['Refresher-Trained Operators', 'refresher_operators'],
        ['Competency matrix exists', 'competency_matrix'],
        ['Supervisors trained', 'supervisors_trained'],
        ['Near misses recorded', 'near_misses_recorded'],
        ['Near misses reviewed', 'near_misses_reviewed'],
      ],
    },
    {
      title: 'Engineering & Lifecycle Awareness',
      fields: [
        ['Design Work Period calculated', 'design_work_period'],
        ['Remaining service life known', 'remaining_service_life'],
        ['Digital monitoring installed', 'digital_monitoring'],
        ['2–5 year capital forecast', 'capital_forecast'],
        ['Duty classification reassessed', 'duty_classification_reassessed'],
      ],
    },
    {
      title: 'Service Provider Review',
      fields: [
        ['Avg Response Time', 'provider_response_time'],
        ['First-Time Fix Rate', 'provider_fix_rate'],
        ['Reports electronic & detailed', 'reports_electronic'],
        ['Reports include risk ranking', 'reports_risk_ranking'],
        ['Engineering advice provided', 'engineering_advice'],
        ['Lifecycle planning discussed', 'lifecycle_planning'],
      ],
    },
  ];

  for (const sec of selectSections) {
    addSectionTitle(sec.title);
    const rows = sec.fields.map(([label, key]) => [label, str(key)]);
    addTable(rows);
  }

  // Training calc
  addSectionTitle('Training Coverage');
  addTable([['Training Coverage Rate', fmtNum(calculations.trainingCoverage, '', '%')]]);

  // Provider open-ended
  if (str('value_most') !== '—' || str('most_frustrating') !== '—' || str('magic_wand') !== '—') {
    addSectionTitle('Provider Feedback');
    const feedbackRows: string[][] = [];
    if (str('value_most') !== '—') feedbackRows.push(['Most Valued', str('value_most')]);
    if (str('most_frustrating') !== '—') feedbackRows.push(['Most Frustrating', str('most_frustrating')]);
    if (str('magic_wand') !== '—') feedbackRows.push(['Magic Wand', str('magic_wand')]);
    addTable(feedbackRows);
  }

  // Performance Summary
  addSectionTitle('Performance Snapshot');
  addTable([
    ['Annual Downtime', fmtNum(calculations.annualDowntime, '', ' hrs')],
    ['Reactive Ratio', fmtNum(calculations.reactiveRatio, '', '%')],
    ['MTTR', fmtNum(calculations.mttr, '', ' hrs')],
    ['Cost Per Breakdown', fmtNum(calculations.costPerBreakdown, '$')],
    ['Annual Downtime Cost', fmtNum(calculations.annualCost, '$')],
    ...(str('backup_crane') === 'No' ? [['Adjusted Cost', fmtNum(calculations.adjustedCost, '$')]] : []),
    ['Training Coverage', fmtNum(calculations.trainingCoverage, '', '%')],
  ]);

  // Static text
  if (y > pageH - 40) { doc.addPage(); addHeader(); y = 28; }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const note = doc.splitTextToSize(
    'This assessment establishes your current crane performance baseline. During our onsite visit, we will review these findings and identify opportunities to reduce risk, downtime, and lifecycle cost. We recommend reassessing these indicators in 12 months to measure improvement.',
    pageW - 30
  );
  doc.text(note, 15, y);

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
