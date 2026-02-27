// ===== Admin Customisation Config =====

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // for select type
  required?: boolean;
}

export interface FieldVisibility {
  fieldKey: string;
  label: string;
  visible: boolean;
}

export interface AdminFormConfig {
  // Report front-page customer detail fields
  reportCustomerFields: FieldVisibility[];
  reportCustomFields: CustomField[];

  // Private custom fields (not shown on reports)
  privateInspectionFields: CustomField[];
  privateAssetFields: CustomField[];

  // Asset form field visibility
  assetAddFields: FieldVisibility[];
  assetDetailFields: FieldVisibility[];
}

// Default customer detail fields that appear on reports
export const DEFAULT_REPORT_CUSTOMER_FIELDS: FieldVisibility[] = [
  { fieldKey: 'client_name', label: 'Client / Company Name', visible: true },
  { fieldKey: 'location_address', label: 'Site Address', visible: true },
  { fieldKey: 'primary_contact_name', label: 'Contact Name', visible: true },
  { fieldKey: 'primary_contact_position', label: 'Contact Position', visible: true },
  { fieldKey: 'primary_contact_email', label: 'Contact Email', visible: true },
  { fieldKey: 'primary_contact_mobile', label: 'Contact Phone', visible: true },
  { fieldKey: 'site_induction_details', label: 'Site Induction Details', visible: false },
  { fieldKey: 'send_schedule_reminders', label: 'Send Schedule Reminders', visible: false },
];

// Default asset add form fields
export const DEFAULT_ASSET_ADD_FIELDS: FieldVisibility[] = [
  { fieldKey: 'description', label: 'Asset Name', visible: true },
  { fieldKey: 'class_name', label: 'Category', visible: true },
  { fieldKey: 'asset_type', label: 'Asset Type', visible: true },
  { fieldKey: 'status', label: 'Status', visible: true },
  { fieldKey: 'barcode', label: 'Barcode / RKA ID', visible: true },
  { fieldKey: 'serial_number', label: 'Serial Number', visible: true },
  { fieldKey: 'location_name', label: 'Location', visible: true },
  { fieldKey: 'area_name', label: 'Area', visible: true },
  { fieldKey: 'swl_tonnes', label: 'Safe Working Load (t)', visible: true },
  { fieldKey: 'lift_height_m', label: 'Lift Height (m)', visible: true },
  { fieldKey: 'installation_date', label: 'Installation Date', visible: true },
  { fieldKey: 'major_inspection_due_date', label: 'Major Inspection Due', visible: true },
  { fieldKey: 'asset_criticality_level', label: 'Criticality Level', visible: true },
  { fieldKey: 'crane_operational_status', label: 'Operational Status', visible: true },
  { fieldKey: 'environment_exposure', label: 'Environment Exposure', visible: true },
  { fieldKey: 'power_supply', label: 'Power Supply', visible: true },
  { fieldKey: 'control_type', label: 'Control Type', visible: true },
  { fieldKey: 'crane_classification', label: 'Crane Classification', visible: false },
  { fieldKey: 'design_standard', label: 'Design Standard', visible: false },
  { fieldKey: 'compliance_status', label: 'Compliance Status', visible: false },
  { fieldKey: 'service_class_usage_intensity', label: 'Service Class', visible: false },
  { fieldKey: 'commission_date', label: 'Commission Date', visible: false },
  { fieldKey: 'structural_design_life_years', label: 'Design Life (years)', visible: false },
  { fieldKey: 'major_inspection_interval_years', label: 'Major Insp. Interval (years)', visible: false },
  { fieldKey: 'asset_lifecycle_stage', label: 'Lifecycle Stage', visible: false },
  { fieldKey: 'replacement_risk_category', label: 'Replacement Risk', visible: false },
  { fieldKey: 'brand_make', label: 'Brand / Make', visible: true },
  { fieldKey: 'year_manufactured', label: 'Year Manufactured', visible: true },
  { fieldKey: 'duty_class', label: 'Duty Class', visible: false },
  { fieldKey: 'access_suggestion', label: 'Access Suggestion', visible: false },
  { fieldKey: 'external_id', label: 'External Reference', visible: false },
  { fieldKey: 'notes', label: 'Notes', visible: true },
  { fieldKey: 'hoist_configuration', label: 'Hoist Configuration', visible: false },
  { fieldKey: 'hook_type', label: 'Hook Type', visible: false },
  { fieldKey: 'pendant_remote', label: 'Pendant / Remote', visible: false },
  { fieldKey: 'trolley_configuration', label: 'Trolley Configuration', visible: false },
];

// Default asset detail modal fields
export const DEFAULT_ASSET_DETAIL_FIELDS: FieldVisibility[] = [
  { fieldKey: 'description', label: 'Description / Name', visible: true },
  { fieldKey: 'class_name', label: 'Category', visible: true },
  { fieldKey: 'asset_type', label: 'Type', visible: true },
  { fieldKey: 'capacity', label: 'Capacity / SWL', visible: true },
  { fieldKey: 'crane_manufacturer', label: 'Manufacturer', visible: true },
  { fieldKey: 'serial_number', label: 'Serial Number', visible: true },
  { fieldKey: 'status', label: 'Status', visible: true },
  { fieldKey: 'location_name', label: 'Location', visible: true },
  { fieldKey: 'area_name', label: 'Area', visible: true },
  { fieldKey: 'length_lift', label: 'Length / Lift', visible: true },
];

export const DEFAULT_ADMIN_CONFIG: AdminFormConfig = {
  reportCustomerFields: DEFAULT_REPORT_CUSTOMER_FIELDS,
  reportCustomFields: [],
  privateInspectionFields: [],
  privateAssetFields: [],
  assetAddFields: DEFAULT_ASSET_ADD_FIELDS,
  assetDetailFields: DEFAULT_ASSET_DETAIL_FIELDS,
};
