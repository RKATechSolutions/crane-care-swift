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
  aiSummary?: string;
}

const DARK: [number, number, number] = [40, 32, 39];
const LIGHT_GRAY: [number, number, number] = [245, 245, 245];
const RKA_GREEN: [number, number, number] = [34, 139, 34];
const RKA_ORANGE: [number, number, number] = [255, 165, 0];
const RKA_RED: [number, number, number] = [220, 53, 69];
const RKA_BLUE: [number, number, number] = [41, 98, 255];

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

// Score a select answer: Yes=2, Partially/Somewhat/Slightly=1, No=0
function scoreAnswer(v: string | null | undefined): number {
  if (!v) return -1;
  const lower = v.toLowerCase();
  if (lower === 'yes') return 2;
  if (['partially', 'somewhat', 'slightly'].includes(lower)) return 1;
  if (lower === 'no' || lower === 'significantly') return 0;
  return -1;
}

function getScoreColor(score: number, max: number): [number, number, number] {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.75) return RKA_GREEN;
  if (pct >= 0.5) return RKA_ORANGE;
  return RKA_RED;
}

export async function generateBaselinePdf(data: BaselinePdfData): Promise<jsPDF> {
  const { siteName, companyName, technicianName, formData, calculations, aiSummary } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  let logoImg: HTMLImageElement | undefined;
  try { logoImg = await loadImage(rkaLogoUrl); } catch { /* skip */ }

  const addHeader = () => {
    if (logoImg) {
      const logoH = 14;
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
  let y = 26;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('RKA Industrial Solutions', pageW / 2, y, { align: 'center' });
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
  const checkPage = (needed = 30) => {
    if (y > pageH - needed) { doc.addPage(); addHeader(); y = 24; }
  };

  const addSectionTitle = (title: string) => {
    checkPage(35);
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
    y = (doc as any).lastAutoTable?.finalY + 6 || y + 6;
  };

  // ─── Section 1: Site & Ops ───
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

  // ─── Section 2: Breakdown Data ───
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

  // ─── Visual: Reliability Gauges ───
  checkPage(55);
  addSectionTitle('Reliability Metrics');

  const gaugeData = [
    { label: 'Annual Downtime', value: calculations.annualDowntime, unit: ' hrs', target: 100, explainer: 'Total hours cranes are out of action per year' },
    { label: 'Reactive Ratio', value: calculations.reactiveRatio, unit: '%', target: 100, explainer: 'Percentage of maintenance that is unplanned' },
    { label: 'Mean Time To Repair', value: calculations.mttr, unit: ' hrs', target: 24, explainer: 'Average hours from breakdown to back in service' },
  ];

  const gaugeW = (pageW - 40) / 3;
  gaugeData.forEach((g, i) => {
    const gx = 15 + i * (gaugeW + 5);
    const gy = y;
    const barH = 8;
    const pct = Math.min(g.value / g.target, 1);
    const color = pct <= 0.33 ? RKA_GREEN : pct <= 0.66 ? RKA_ORANGE : RKA_RED;

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(g.label, gx, gy);

    // Bar background
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(gx, gy + 2, gaugeW, barH, 2, 2, 'F');

    // Bar fill
    doc.setFillColor(...color);
    const fillW = Math.max(pct * gaugeW, 2);
    doc.roundedRect(gx, gy + 2, fillW, barH, 2, 2, 'F');

    // Value
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtNum(g.value, '', g.unit), gx + gaugeW / 2, gy + 7.5, { align: 'center' });

    // Explainer
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(g.explainer, gx, gy + 14);
  });
  y += 20;

  // ─── Section 3: Financial ───
  checkPage(55);
  addSectionTitle('Financial Downtime Impact');

  // Visual: cost bars
  const costItems = [
    { label: 'Cost Per Breakdown', value: calculations.costPerBreakdown, explainer: 'Revenue lost each time a crane goes down' },
    { label: 'Annual Downtime Cost', value: calculations.annualCost, explainer: 'Total yearly revenue impact from all downtime' },
  ];
  if (str('backup_crane') === 'No') {
    costItems.push({
      label: 'Adjusted Cost (No Backup)',
      value: calculations.adjustedCost,
      explainer: 'Includes 20% buffer for overtime, delays & penalties',
    });
  }

  const maxCost = Math.max(...costItems.map(c => c.value), 1);
  costItems.forEach((item, i) => {
    const iy = y + i * 16;
    checkPage(20);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(item.label, 15, iy);

    const barMaxW = pageW - 80;
    const barPct = Math.min(item.value / maxCost, 1);
    const barColor = i === costItems.length - 1 && str('backup_crane') === 'No' ? RKA_RED : RKA_BLUE;

    doc.setFillColor(230, 230, 230);
    doc.roundedRect(15, iy + 2, barMaxW, 6, 1.5, 1.5, 'F');
    doc.setFillColor(...barColor);
    doc.roundedRect(15, iy + 2, Math.max(barPct * barMaxW, 2), 6, 1.5, 1.5, 'F');

    doc.setFontSize(9);
    doc.text(fmtNum(item.value, '$'), 15 + barMaxW + 3, iy + 7);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(item.explainer, 15, iy + 12);
  });
  y += costItems.length * 16 + 4;

  // ─── Culture Sections with Scoring ───
  const cultureSections: { title: string; fields: [string, string][] }[] = [
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
        ['Reports electronic & detailed', 'reports_electronic'],
        ['Reports include risk ranking', 'reports_risk_ranking'],
        ['Engineering advice provided', 'engineering_advice'],
        ['Lifecycle planning discussed', 'lifecycle_planning'],
      ],
    },
  ];

  // Draw culture sections with visual score bars
  for (const sec of cultureSections) {
    checkPage(40);
    addSectionTitle(sec.title);

    let sectionScore = 0;
    let sectionMax = 0;
    const rows: string[][] = [];
    sec.fields.forEach(([label, key]) => {
      const val = str(key);
      rows.push([label, val]);
      const s = scoreAnswer(val);
      if (s >= 0) { sectionScore += s; sectionMax += 2; }
    });

    // Section score bar
    if (sectionMax > 0) {
      const pct = sectionScore / sectionMax;
      const barW = 60;
      const color = getScoreColor(sectionScore, sectionMax);

      doc.setFillColor(230, 230, 230);
      doc.roundedRect(pageW - 15 - barW, y - 5, barW, 5, 1.5, 1.5, 'F');
      doc.setFillColor(...color);
      doc.roundedRect(pageW - 15 - barW, y - 5, Math.max(pct * barW, 2), 5, 1.5, 1.5, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(`${Math.round(pct * 100)}%`, pageW - 15 - barW - 8, y - 1.5);
    }

    addTable(rows);
  }

  // Training Coverage
  checkPage(20);
  addSectionTitle('Training Coverage');
  const tcPct = Math.min(calculations.trainingCoverage / 100, 1);
  const tcColor = tcPct >= 0.8 ? RKA_GREEN : tcPct >= 0.5 ? RKA_ORANGE : RKA_RED;
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(15, y, pageW - 30, 8, 2, 2, 'F');
  doc.setFillColor(...tcColor);
  doc.roundedRect(15, y, Math.max(tcPct * (pageW - 30), 2), 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${fmtNum(calculations.trainingCoverage, '', '%')}`, pageW / 2, y + 6, { align: 'center' });
  doc.setTextColor(...DARK);
  y += 12;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Percentage of operators with current refresher training. Below 80% indicates a training gap.', 15, y);
  y += 8;

  // Provider Feedback
  if (str('value_most') !== '—' || str('most_frustrating') !== '—' || str('magic_wand') !== '—') {
    addSectionTitle('Provider Feedback');
    const feedbackRows: string[][] = [];
    if (str('value_most') !== '—') feedbackRows.push(['Most Valued', str('value_most')]);
    if (str('most_frustrating') !== '—') feedbackRows.push(['Most Frustrating', str('most_frustrating')]);
    if (str('magic_wand') !== '—') feedbackRows.push(['Magic Wand', str('magic_wand')]);
    addTable(feedbackRows);
  }

  // ─── AI Summary Page ───
  if (aiSummary) {
    doc.addPage();
    addHeader();
    y = 24;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('AI Strategic Summary', pageW / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(...RKA_BLUE);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageW - 15, y);
    y += 6;

    // Strip markdown and render
    const cleanText = aiSummary
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);

    const lines = doc.splitTextToSize(cleanText, pageW - 30);
    for (const line of lines) {
      if (y > pageH - 20) { doc.addPage(); addHeader(); y = 24; }
      doc.text(line, 15, y);
      y += 4;
    }
  }

  // ─── Performance Snapshot (Visual Summary Page) ───
  doc.addPage();
  addHeader();
  y = 24;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Performance Snapshot', pageW / 2, y, { align: 'center' });
  y += 10;

  // Summary cards
  const summaryItems = [
    { label: 'Annual Downtime', value: fmtNum(calculations.annualDowntime, '', ' hrs'), explainer: 'Total crane downtime per year from all breakdowns', color: calculations.annualDowntime > 50 ? RKA_RED : calculations.annualDowntime > 20 ? RKA_ORANGE : RKA_GREEN },
    { label: 'Reactive Ratio', value: fmtNum(calculations.reactiveRatio, '', '%'), explainer: 'Share of maintenance that is unplanned emergency work', color: calculations.reactiveRatio > 60 ? RKA_RED : calculations.reactiveRatio > 30 ? RKA_ORANGE : RKA_GREEN },
    { label: 'Mean Time To Repair', value: fmtNum(calculations.mttr, '', ' hrs'), explainer: 'Average hours from breakdown to crane back in service', color: calculations.mttr > 8 ? RKA_RED : calculations.mttr > 4 ? RKA_ORANGE : RKA_GREEN },
    { label: 'Cost Per Breakdown', value: fmtNum(calculations.costPerBreakdown, '$'), explainer: 'Revenue lost each time a crane goes down', color: RKA_BLUE },
    { label: 'Annual Downtime Cost', value: fmtNum(calculations.annualCost, '$'), explainer: 'Total yearly revenue impact from all crane downtime', color: RKA_BLUE },
    ...(str('backup_crane') === 'No' ? [{ label: 'Adjusted Cost (No Backup)', value: fmtNum(calculations.adjustedCost, '$'), explainer: 'Includes 20% buffer for overtime, delays and penalties when no backup crane is available', color: RKA_RED }] : []),
    { label: 'Training Coverage', value: fmtNum(calculations.trainingCoverage, '', '%'), explainer: 'Percentage of operators with current refresher training', color: calculations.trainingCoverage >= 80 ? RKA_GREEN : calculations.trainingCoverage >= 50 ? RKA_ORANGE : RKA_RED },
  ];

  const cardW = (pageW - 35) / 2;
  summaryItems.forEach((item, i) => {
    const col = i % 2;
    const cx = 15 + col * (cardW + 5);
    if (col === 0 && i > 0) y += 28;
    if (col === 0) checkPage(32);
    const cy = y;

    // Card background
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(cx, cy, cardW, 24, 3, 3, 'F');

    // Color indicator
    doc.setFillColor(...item.color);
    doc.roundedRect(cx, cy, 3, 24, 1.5, 1.5, 'F');

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(item.label, cx + 7, cy + 6);

    // Value
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(item.value, cx + 7, cy + 14);

    // Explainer
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    const expLines = doc.splitTextToSize(item.explainer, cardW - 12);
    doc.text(expLines[0], cx + 7, cy + 19);
  });
  y += 32;

  // Static text
  checkPage(20);
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
