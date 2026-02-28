import { Site, InspectionTemplate } from '@/types/inspection';

export const mockSites: Site[] = [
  {
    id: 'site-1',
    name: 'BHP Steelworks - Port Kembla',
    address: '120 Industrial Drive, Port Kembla NSW 2505',
    contactName: 'Mark Thompson',
    contactPhone: '0412 345 678',
    cranes: [
      { id: 'crane-1', siteId: 'site-1', name: 'Bay 1 - 10T EOT', type: 'Single Girder Overhead', serialNumber: 'SG-2019-0451', capacity: '10 Tonne', manufacturer: 'Konecranes', yearInstalled: 2019 },
      { id: 'crane-2', siteId: 'site-1', name: 'Bay 2 - 5T EOT', type: 'Single Girder Overhead', serialNumber: 'SG-2020-0312', capacity: '5 Tonne', manufacturer: 'Demag', yearInstalled: 2020 },
      { id: 'crane-3', siteId: 'site-1', name: 'Yard Gantry', type: 'Gantry Crane', serialNumber: 'GC-2018-0089', capacity: '20 Tonne', manufacturer: 'Liebherr', yearInstalled: 2018 },
    ],
  },
  {
    id: 'site-2',
    name: 'Visy Paper Mill - Tumut',
    address: '45 Mill Road, Tumut NSW 2720',
    contactName: 'Sarah Chen',
    contactPhone: '0423 456 789',
    cranes: [
      { id: 'crane-4', siteId: 'site-2', name: 'Roll Store Crane', type: 'Double Girder Overhead', serialNumber: 'DG-2017-0201', capacity: '15 Tonne', manufacturer: 'Konecranes', yearInstalled: 2017 },
      { id: 'crane-5', siteId: 'site-2', name: 'Loading Bay Jib', type: 'Jib Crane', serialNumber: 'JC-2021-0045', capacity: '2 Tonne', manufacturer: 'Verlinde', yearInstalled: 2021 },
    ],
  },
  {
    id: 'site-3',
    name: 'Orica Mining Services - Newcastle',
    address: '88 Harbour Way, Newcastle NSW 2300',
    contactName: 'James Wilson',
    contactPhone: '0434 567 890',
    cranes: [
      { id: 'crane-6', siteId: 'site-3', name: 'Warehouse 3T', type: 'Single Girder Overhead', serialNumber: 'SG-2022-0178', capacity: '3 Tonne', manufacturer: 'Street Crane', yearInstalled: 2022 },
      { id: 'crane-7', siteId: 'site-3', name: 'Monorail - Assembly', type: 'Monorail', serialNumber: 'MR-2020-0067', capacity: '1 Tonne', manufacturer: 'Demag', yearInstalled: 2020 },
    ],
  },
  {
    id: 'site-4',
    name: 'Bluescope Steel - Western Port',
    address: '200 Factory Road, Hastings VIC 3915',
    contactName: 'David Brown',
    contactPhone: '0445 678 901',
    cranes: [
      { id: 'crane-8', siteId: 'site-4', name: 'Coil Store 25T', type: 'Single Girder Overhead', serialNumber: 'SG-2018-0299', capacity: '25 Tonne', manufacturer: 'Konecranes', yearInstalled: 2018 },
    ],
  },
];

export const mockTemplate: InspectionTemplate = {
  id: 'tmpl-1',
  craneType: 'Single Girder Overhead',
  inspectionType: 'Quarterly',
  version: 6,
  isActive: true,
  createdAt: '2024-01-15',
  sections: [
    // SECTION 0 – HISTORICAL & LIFECYCLE VERIFICATION
    {
      id: 'sec-lifecycle',
      name: 'Lifecycle',
      sortOrder: 0,
      items: [
        // A. Major Inspection Currency
        { id: 's0-1', label: '10 Year Major Inspection Status', sortOrder: 1, type: 'single_select', options: ['Due', 'Not Due'], required: true, optionalComment: true },
        { id: 's0-2', label: '25 Year Structural Inspection Status', sortOrder: 2, type: 'single_select', options: ['Due', 'Not Due'], required: true, optionalComment: true },
        { id: 's0-3', label: 'Major Inspection Plate Fitted and Updated', sortOrder: 3, type: 'single_select', options: ['Yes', 'No'], conditionalCommentOn: 'No', required: true },
        // B. Log Book & Prestart
        { id: 's0-4', label: 'Crane Log Book Present On Site', sortOrder: 4, type: 'single_select', options: ['Yes', 'No'], conditionalCommentOn: 'No', required: true, optionalComment: true, optionalPhoto: true },
        { id: 's0-5', label: 'Log Information Current', sortOrder: 5, type: 'single_select', options: ['Yes', 'No'], conditionalCommentOn: 'No', required: true },
        { id: 's0-6', label: 'Operator Pre-Start System In Place and Carried Out', sortOrder: 6, type: 'single_select', options: ['Yes', 'No'], conditionalCommentOn: 'No', required: true },
        // C. Isolation Devices
        { id: 's0-7', label: 'Main Isolating Switch', sortOrder: 7 },
        { id: 's0-8', label: 'Crane Isolating Switch', sortOrder: 8 },
        // D. Runway & Structural Interface
        { id: 's0-9', label: 'Foundations / Anchor Bolts', sortOrder: 9 },
        { id: 's0-10', label: 'Runway Stops', sortOrder: 10 },
        { id: 's0-11', label: 'Rail Splicing', sortOrder: 11 },
        { id: 's0-12', label: 'Rail Spacing', sortOrder: 12 },
        { id: 's0-13', label: 'Runway Power Conductor Guards', sortOrder: 13 },
      ],
    },
    // SECTION 1 – STRUCTURAL
    {
      id: 'sec-structure',
      name: 'Structure',
      sortOrder: 1,
      items: [
        { id: 'item-1', label: 'Bridge girder — visual check for cracks, deformation or corrosion', sortOrder: 1 },
        { id: 'item-2', label: 'End carriages — check for damage, cracks or loose bolts', sortOrder: 2 },
        { id: 'item-3', label: 'Runway beams — check alignment and rail condition', sortOrder: 3 },
        { id: 'item-4', label: 'Supporting structure — check for visible distortion or movement', sortOrder: 4 },
        { id: 'item-5', label: 'Walkways and access — check condition and handrails secure', sortOrder: 5 },
      ],
    },
    // SECTION 2 – MECHANICAL SYSTEMS (HOIST)
    {
      id: 'sec-hoist',
      name: 'Mechanical',
      sortOrder: 2,
      items: [
        { id: 'item-6', label: 'Wire rope — check for broken wires, kinks or corrosion', sortOrder: 1 },
        { id: 'item-7', label: 'Hook and hook block — check for wear, cracks or deformation', sortOrder: 2 },
        { id: 'item-8', label: 'Hook safety latch — operational check', sortOrder: 3 },
        { id: 'item-9', label: 'Hoist brake — functional test', sortOrder: 4 },
        { id: 'item-10', label: 'Drum and sheaves — check for wear and groove condition', sortOrder: 5 },
        { id: 'item-11', label: 'Load chain (if applicable) — check for wear and elongation', sortOrder: 6 },
        // NEW items added at end
        { id: 'item-m1', label: 'Drive Shaft – Bridge', sortOrder: 7 },
        { id: 'item-m2', label: 'Drive Shaft – Trolley', sortOrder: 8 },
        { id: 'item-m3', label: 'Wheel Bearings', sortOrder: 9 },
        { id: 'item-m4', label: 'Equalizer Sheave', sortOrder: 10 },
        { id: 'item-m5', label: 'Rope Guide', sortOrder: 11 },
        { id: 'item-m6', label: 'Coupling', sortOrder: 12 },
        { id: 'item-m7', label: 'Holding Brake – Hoist', sortOrder: 13 },
      ],
    },
    // SECTION 3 – ELECTRICAL & CONTROL
    {
      id: 'sec-electrical',
      name: 'Electrical',
      sortOrder: 3,
      items: [
        { id: 'item-12', label: 'Pendant control — check buttons, labels and condition', sortOrder: 1 },
        { id: 'item-13', label: 'Festoon / cable reeling — check for damage or sag', sortOrder: 2 },
        { id: 'item-14', label: 'Isolator and main switch — operational check', sortOrder: 3 },
        { id: 'item-15', label: 'Warning devices — horn, lights functional test', sortOrder: 4 },
        { id: 'item-16', label: 'Wiring and connections — visual check for damage', sortOrder: 5 },
        // NEW limit switch items
        { id: 'item-e1', label: 'Lower Limit Switch', sortOrder: 6 },
        { id: 'item-e2', label: 'Primary Upper Limit Switch', sortOrder: 7 },
        { id: 'item-e3', label: 'Ultimate Upper Limit Switch', sortOrder: 8 },
        // Condition Monitor Data Capture
        { id: 'item-cm1', label: 'Hoist SWP Percentage', sortOrder: 9, type: 'numeric' },
        { id: 'item-cm2', label: 'Brake SWP Percentage', sortOrder: 10, type: 'numeric' },
        { id: 'item-cm3', label: 'Total Starts', sortOrder: 11, type: 'numeric' },
        { id: 'item-cm4', label: 'Total Run Time (Hours)', sortOrder: 12, type: 'numeric' },
        { id: 'item-cm5', label: 'Total Cycles', sortOrder: 13, type: 'numeric' },
        { id: 'item-cm6', label: 'Recorded Overloads', sortOrder: 14, type: 'numeric' },
        { id: 'item-cm7', label: 'Recorded Emergency Stops', sortOrder: 15, type: 'numeric' },
        { id: 'item-cm8', label: 'Maximum Recorded Load Percentage', sortOrder: 16, type: 'numeric' },
      ],
    },
    // SECTION 4 – SAFETY & COMPLIANCE DEVICES
    {
      id: 'sec-safety',
      name: 'Safety',
      sortOrder: 4,
      items: [
        { id: 'item-22', label: 'Overload protection — functional test', sortOrder: 1 },
        { id: 'item-23', label: 'Upper limit switch — functional test', sortOrder: 2 },
        { id: 'item-24', label: 'Lower limit switch — functional test', sortOrder: 3 },
        { id: 'item-25', label: 'Emergency stop — all E-stops functional', sortOrder: 4 },
        { id: 'item-26', label: 'Anti-collision (if fitted) — functional test', sortOrder: 5 },
        // NEW
        { id: 'item-s1', label: 'Hook Block Capacity Markings', sortOrder: 6 },
      ],
    },
    // SECTION 5 – TRAVEL
    {
      id: 'sec-travel',
      name: 'Travel',
      sortOrder: 5,
      items: [
        { id: 'item-17', label: 'Long travel — smooth operation, no abnormal noise', sortOrder: 1 },
        { id: 'item-18', label: 'Cross travel — smooth operation, no abnormal noise', sortOrder: 2 },
        { id: 'item-19', label: 'Travel wheels — check for wear and alignment', sortOrder: 3 },
        { id: 'item-20', label: 'Travel brakes — functional test', sortOrder: 4 },
        { id: 'item-21', label: 'Buffer stops — check condition and mounting', sortOrder: 5 },
      ],
    },
    // SECTION 6 – ASSET OUTCOME
    {
      id: 'sec-general',
      name: 'Asset Outcome',
      sortOrder: 6,
      items: [
        // NEW Certificate Issued field above existing items
        { id: 'item-cert', label: 'Certificate Issued', sortOrder: 0, type: 'single_select', options: ['Yes', 'No'], required: true },
        { id: 'item-27', label: 'Crane ID plate — legible and present', sortOrder: 1 },
        { id: 'item-28', label: 'SWL markings — clearly visible', sortOrder: 2 },
        { id: 'item-29', label: 'Lubrication — adequate across all points', sortOrder: 3 },
        { id: 'item-30', label: 'General cleanliness — crane and surrounding area', sortOrder: 4 },
      ],
    },
  ],
};

export const mockTemplateLiftingEquipment: InspectionTemplate = {
  id: 'template_lifting_equipment_v1',
  craneType: 'Lifting Equipment',
  inspectionType: 'Quarterly',
  version: 1,
  isActive: true,
  createdAt: '2026-02-28',
  sections: [
    {
      id: 'le_details',
      name: 'Equipment Details',
      sortOrder: 0,
      items: [
        { id: 'le_asset_id', label: 'Asset ID / Tag', sortOrder: 1, type: 'text' },
        { id: 'le_type', label: 'Equipment Type', sortOrder: 2, type: 'single_select', options: ['Chain sling', 'Webbing sling', 'Round sling', 'Shackle', 'Spreader beam', 'Lifting clamp', 'Other'], required: true },
        { id: 'le_swl', label: 'SWL / WLL', sortOrder: 3, type: 'numeric' },
        { id: 'le_manufacturer', label: 'Manufacturer (if known)', sortOrder: 4, type: 'text' },
        { id: 'le_serial', label: 'Serial / Batch (if known)', sortOrder: 5, type: 'text' },
      ],
    },
    {
      id: 'le_identification',
      name: 'Identification & Compliance',
      sortOrder: 1,
      items: [
        { id: 'le_id_tag', label: 'Identification tag/label present & legible', sortOrder: 1 },
        { id: 'le_register', label: 'Listed on lifting gear register', sortOrder: 2 },
        { id: 'le_inspection_interval', label: 'Inspection interval current', sortOrder: 3 },
      ],
    },
    {
      id: 'le_condition',
      name: 'Condition Checks',
      sortOrder: 2,
      items: [
        { id: 'le_damage', label: 'No cuts, tears, gouges, crushing, kinks, or deformation', sortOrder: 1 },
        { id: 'le_corrosion', label: 'No excessive corrosion / pitting / chemical attack', sortOrder: 2 },
        { id: 'le_wear', label: 'Wear within acceptable limits', sortOrder: 3 },
        { id: 'le_hooks_fittings', label: 'Fittings / hooks / master links serviceable (if fitted)', sortOrder: 4 },
      ],
    },
    {
      id: 'le_photos',
      name: 'Photos (When Required)',
      sortOrder: 3,
      items: [
        { id: 'le_defect_photos', label: 'Photos of defects (required if any FAIL)', sortOrder: 1, type: 'photo_required' },
      ],
    },
    {
      id: 'le_outcome',
      name: 'Outcome',
      sortOrder: 4,
      items: [
        { id: 'le_result', label: 'Outcome', sortOrder: 1, type: 'single_select', options: ['Fit for use', 'Fit for use with recommendations', 'Remove from service', 'Repair required'], required: true },
        { id: 'le_notes', label: 'Technician Notes', sortOrder: 2, type: 'text' },
      ],
    },
  ],
};

export const mockUsers = [
  { id: 'tech-1', name: 'Aaron Harrison', email: 'aaron@rka.com.au', role: 'technician' as const },
  { id: 'tech-2', name: 'Vince Fernandez', email: 'vince@rka.com.au', role: 'technician' as const },
  { id: 'tech-3', name: 'Ryan Adams', email: 'ryan@rka.com.au', role: 'technician' as const },
  { id: 'tech-4', name: 'Seth Adams', email: 'seth@rka.com.au', role: 'technician' as const },
  { id: 'admin-1', name: 'Lisa Chen', email: 'lisa@rka.com.au', role: 'admin' as const, pin: '1234' },
];
