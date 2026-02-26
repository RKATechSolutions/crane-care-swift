// 7-Facet Site & Lifting Operations Assessment - Question Data

export interface AssessmentQuestion {
  id: string;
  label: string;
}

export interface AssessmentGroup {
  id: string;
  title: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentFacet {
  id: string;
  number: number;
  title: string;
  questions: AssessmentQuestion[];
}

// PART A: Pre-Site Questionnaire
export const partAGroups: AssessmentGroup[] = [
  {
    id: 'a_asset_compliance',
    title: 'Asset & Compliance Snapshot',
    questions: [
      { id: 'a1', label: 'Up-to-date crane & lifting equipment register maintained' },
      { id: 'a2', label: 'All inspections current and scheduled' },
      { id: 'a3', label: 'Major inspections tracked (e.g. 10-year)' },
      { id: 'a4', label: 'Defects tracked through to close-out' },
    ],
  },
  {
    id: 'a_maintenance',
    title: 'Maintenance & Breakdowns',
    questions: [
      { id: 'a5', label: 'Preventative maintenance scheduled and adhered to' },
      { id: 'a6', label: 'Breakdown response process documented' },
      { id: 'a7', label: 'Downtime caused by crane failures tracked' },
    ],
  },
  {
    id: 'a_safety',
    title: 'Safety & Load Control',
    questions: [
      { id: 'a8', label: 'Operations managed within rated capacities' },
      { id: 'a9', label: 'Lift plans used when required' },
      { id: 'a10', label: 'Emergency & isolation procedures documented' },
    ],
  },
  {
    id: 'a_people',
    title: 'People & Training',
    questions: [
      { id: 'a11', label: 'Operator training records maintained' },
      { id: 'a12', label: 'Refresher training scheduled' },
      { id: 'a13', label: 'High-risk licences verified where required' },
    ],
  },
  {
    id: 'a_planning',
    title: 'Asset Planning & Strategy',
    questions: [
      { id: 'a14', label: 'Lifecycle planning considered for ageing cranes' },
      { id: 'a15', label: 'Engineering assessments conducted where required' },
      { id: 'a16', label: 'Budget allocated for upgrades' },
    ],
  },
  {
    id: 'a_governance',
    title: 'Reporting & Governance',
    questions: [
      { id: 'a17', label: 'Inspection reports electronic and photo-supported' },
      { id: 'a18', label: 'Management reviews lifting performance annually' },
      { id: 'a19', label: 'Improvement actions tracked' },
    ],
  },
];

// PART B: Structured Technician Assessment - 7 Facets
export const partBFacets: AssessmentFacet[] = [
  {
    id: 'facet1',
    number: 1,
    title: 'Asset Portfolio & Lifecycle Strategy',
    questions: [
      { id: 'b1_1', label: 'Asset register accuracy verified' },
      { id: 'b1_2', label: 'Critical assets identified by production impact' },
      { id: 'b1_3', label: 'Lifecycle or replacement planning exists' },
      { id: 'b1_4', label: 'Engineering assessments conducted where required' },
    ],
  },
  {
    id: 'facet2',
    number: 2,
    title: 'Inspection & Compliance',
    questions: [
      { id: 'b2_1', label: 'All statutory inspections current' },
      { id: 'b2_2', label: 'Inspection scheduling system in place' },
      { id: 'b2_3', label: 'Major inspection tracking documented' },
      { id: 'b2_4', label: 'Non-conformances actioned and closed' },
    ],
  },
  {
    id: 'facet3',
    number: 3,
    title: 'Maintenance & Breakdown',
    questions: [
      { id: 'b3_1', label: 'Preventative maintenance program active' },
      { id: 'b3_2', label: 'Breakdown response time acceptable' },
      { id: 'b3_3', label: 'Spare parts availability managed' },
    ],
  },
  {
    id: 'facet4',
    number: 4,
    title: 'Safety & Load Control',
    questions: [
      { id: 'b4_1', label: 'Safe working loads clearly marked' },
      { id: 'b4_2', label: 'Lift planning procedures followed' },
      { id: 'b4_3', label: 'Emergency procedures current and accessible' },
      { id: 'b4_4', label: 'Isolation procedures documented and followed' },
    ],
  },
  {
    id: 'facet5',
    number: 5,
    title: 'People & Competency',
    questions: [
      { id: 'b5_1', label: 'Operator competency records current' },
      { id: 'b5_2', label: 'High-risk work licences verified' },
      { id: 'b5_3', label: 'Refresher training program in place' },
    ],
  },
  {
    id: 'facet6',
    number: 6,
    title: 'Environment & Conditions',
    questions: [
      { id: 'b6_1', label: 'Operating environment assessed for risks' },
      { id: 'b6_2', label: 'Environmental factors documented (corrosion, heat, dust)' },
      { id: 'b6_3', label: 'Housekeeping around crane areas adequate' },
    ],
  },
  {
    id: 'facet7',
    number: 7,
    title: 'Governance & Improvement',
    questions: [
      { id: 'b7_1', label: 'Management reviews lifting operations annually' },
      { id: 'b7_2', label: 'Improvement actions tracked to completion' },
      { id: 'b7_3', label: 'Incident reporting and investigation process exists' },
      { id: 'b7_4', label: 'KPIs or metrics used for lifting operations' },
    ],
  },
];

export const scoreLabels: Record<number, string> = {
  2: 'Yes – Fully Implemented',
  1: 'Partially / Improving',
  0: 'Not Yet Implemented',
};

export const facetNames: Record<string, string> = {
  facet1: 'Asset Lifecycle',
  facet2: 'Inspection & Compliance',
  facet3: 'Maintenance & Breakdown',
  facet4: 'Safety & Load Control',
  facet5: 'People & Competency',
  facet6: 'Environment & Conditions',
  facet7: 'Governance & Improvement',
};
