// ===== Core Types =====

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'technician' | 'admin';
  pin?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  cranes: Crane[];
}

export interface Crane {
  id: string;
  siteId: string;
  name: string;
  type: CraneType;
  serialNumber: string;
  capacity: string;
  manufacturer: string;
  yearInstalled: number;
}

export type CraneType =
  | 'Single Girder Overhead'
  | 'Double Girder Overhead'
  | 'Jib Crane'
  | 'Gantry Crane'
  | 'Monorail';

// ===== Template System =====

export interface InspectionTemplate {
  id: string;
  craneType: CraneType;
  inspectionType: 'Quarterly' | 'Annual' | 'Pre-Use';
  version: number;
  isActive: boolean;
  createdAt: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  name: string;
  sortOrder: number;
  items: TemplateItem[];
}

export type TemplateItemType = 'checklist' | 'single_select' | 'numeric';

export interface TemplateItem {
  id: string;
  label: string;
  sortOrder: number;
  type?: TemplateItemType; // default 'checklist'
  options?: string[]; // for single_select
  conditionalCommentOn?: string; // value that triggers required comment (e.g. 'No')
  required?: boolean; // default true for single_select
  optionalComment?: boolean; // show optional comment field always
  optionalPhoto?: boolean; // show optional photo upload always
}

// ===== Inspection =====

export type InspectionStatus = 'draft' | 'in_progress' | 'completed';
export type CraneOperationalStatus = 'Safe to Operate' | 'Operate with Limitations' | 'Unsafe to Operate';
export type DefectSeverity = 'Minor' | 'Major' | 'Critical';
export type RectificationTimeframe = 'Immediately' | 'Within 7 Days' | 'Within 30 Days' | 'Before Next Service';
export type DefectType = 'Mechanical' | 'Electrical' | 'Structural' | 'Safety Device' | 'Operational' | 'Cosmetic';
export type QuoteStatus = 'Quote Now' | 'Quote Later';

export interface Inspection {
  id: string;
  siteId: string;
  craneId: string;
  templateId: string;
  templateVersion: number;
  technicianId: string;
  status: InspectionStatus;
  craneStatus?: CraneOperationalStatus;
  craneStatusOverridden?: boolean;
  startedAt: string;
  completedAt?: string;
  lastEditedAt?: string;
  items: InspectionItemResult[];
  nextInspectionDate?: string;
  suggestedQuestions?: SuggestedQuestion[];
}

export interface SuggestedQuestion {
  id: string;
  sectionId: string;
  question: string;
  answer?: string;
  suggestedBy: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  inspectionId?: string;
  craneName?: string;
  siteName?: string;
}

export interface SentReport {
  id: string;
  type: 'inspection_pdf' | 'job_summary_pdf' | 'site_assessment_pdf' | 'email';
  title: string;
  recipientName?: string;
  recipientEmail?: string;
  sentAt: string;
  sentBy: string;
}

export interface InspectionItemResult {
  templateItemId: string;
  sectionId: string;
  result?: 'pass' | 'defect' | 'unresolved';
  comment?: string;
  photos?: string[];
  defect?: DefectDetail;
  unresolvedStatus?: 'still_unresolved' | 'resolved';
  unresolvedPhotos?: string[];
  selectedValue?: string; // for single_select items
  conditionalComment?: string; // comment when conditional trigger met
  numericValue?: number; // for numeric items
  suggestedValue?: string; // technician-suggested option pending admin approval
}

export interface DefectDetail {
  defectType: DefectType;
  severity: DefectSeverity;
  rectificationTimeframe: RectificationTimeframe;
  recommendedAction: string;
  notes: string;
  photos: string[];
  quoteStatus?: QuoteStatus;
}

// ===== Site Job Summary =====

export interface SiteJobSummary {
  siteId: string;
  inspectionIds: string[];
  nextInspectionDate: string;
  nextInspectionTime: string;
  bookingConfirmed: boolean;
  customerName: string;
  customerSignature?: string;
  technicianSignature?: string;
  rating?: number;
  feedback?: string;
  publishTestimonial: boolean;
  completedAt?: string;
}

// ===== Note to Admin =====

export type AdminNoteCategory =
  | 'App bug / form not working'
  | 'Missing option / dropdown update needed'
  | 'Access issue / incomplete inspection'
  | 'Customer request'
  | 'Other';

export interface AdminNote {
  id: string;
  technicianId: string;
  technicianName: string;
  siteId?: string;
  craneId?: string;
  category: AdminNoteCategory;
  message: string;
  photo?: string;
  timestamp: string;
}
