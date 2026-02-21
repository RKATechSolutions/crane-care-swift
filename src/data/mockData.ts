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
  version: 1,
  isActive: true,
  createdAt: '2024-01-15',
  sections: [
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
    {
      id: 'sec-hoist',
      name: 'Hoist',
      sortOrder: 2,
      items: [
        { id: 'item-6', label: 'Wire rope — check for broken wires, kinks or corrosion', sortOrder: 1 },
        { id: 'item-7', label: 'Hook and hook block — check for wear, cracks or deformation', sortOrder: 2 },
        { id: 'item-8', label: 'Hook safety latch — operational check', sortOrder: 3 },
        { id: 'item-9', label: 'Hoist brake — functional test', sortOrder: 4 },
        { id: 'item-10', label: 'Drum and sheaves — check for wear and groove condition', sortOrder: 5 },
        { id: 'item-11', label: 'Load chain (if applicable) — check for wear and elongation', sortOrder: 6 },
      ],
    },
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
      ],
    },
    {
      id: 'sec-travel',
      name: 'Travel',
      sortOrder: 4,
      items: [
        { id: 'item-17', label: 'Long travel — smooth operation, no abnormal noise', sortOrder: 1 },
        { id: 'item-18', label: 'Cross travel — smooth operation, no abnormal noise', sortOrder: 2 },
        { id: 'item-19', label: 'Travel wheels — check for wear and alignment', sortOrder: 3 },
        { id: 'item-20', label: 'Travel brakes — functional test', sortOrder: 4 },
        { id: 'item-21', label: 'Buffer stops — check condition and mounting', sortOrder: 5 },
      ],
    },
    {
      id: 'sec-safety',
      name: 'Safety',
      sortOrder: 5,
      items: [
        { id: 'item-22', label: 'Overload protection — functional test', sortOrder: 1 },
        { id: 'item-23', label: 'Upper limit switch — functional test', sortOrder: 2 },
        { id: 'item-24', label: 'Lower limit switch — functional test', sortOrder: 3 },
        { id: 'item-25', label: 'Emergency stop — all E-stops functional', sortOrder: 4 },
        { id: 'item-26', label: 'Anti-collision (if fitted) — functional test', sortOrder: 5 },
      ],
    },
    {
      id: 'sec-general',
      name: 'General',
      sortOrder: 6,
      items: [
        { id: 'item-27', label: 'Crane ID plate — legible and present', sortOrder: 1 },
        { id: 'item-28', label: 'SWL markings — clearly visible', sortOrder: 2 },
        { id: 'item-29', label: 'Lubrication — adequate across all points', sortOrder: 3 },
        { id: 'item-30', label: 'General cleanliness — crane and surrounding area', sortOrder: 4 },
      ],
    },
  ],
};

export const mockUsers = [
  { id: 'tech-1', name: 'Jake Morrison', email: 'jake@rka.com.au', role: 'technician' as const, pin: '1234' },
  { id: 'tech-2', name: 'Ryan Peters', email: 'ryan@rka.com.au', role: 'technician' as const, pin: '5678' },
  { id: 'admin-1', name: 'Lisa Chen', email: 'lisa@rka.com.au', role: 'admin' as const, pin: '0000' },
];
