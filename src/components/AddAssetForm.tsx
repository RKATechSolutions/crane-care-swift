import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AddAssetFormProps {
  siteId: string;
  siteName: string;
  clientId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

const ASSET_TYPE_OPTIONS = [
  'Auto Stacker Crane','Boom','Bridge','Bridge w/ Runway','Cathead Jib','Chain Set','Chainfall',
  'Double Girder O/H Crane','Fassi hydraulic Jib','Gantry','Hoist Only','Jib Crane','KBK',
  'Lifting Jig','Mobile','Mobile Crane','Mobile Floor','Mobile Floor Crane','Monorail','Other',
  'Portal Crane','Scissor','Single Girder','Single Girder Crane','Single Hoist Monorail',
  'Sling Set With Hooks','Synthetic Sling',
];

const BRAND_OPTIONS = [
  'BELLINGHAM','DEMAG','EILBECK','ENDO','GIS','GMCC','HITACHI','KITTO',
  'PACIFIC HOISTS','PWB / KITTO','UNKNOWN',
];

const POWER_SUPPLY_OPTIONS = [
  '12v Hydraulic','208V-1Ph-60Hz','208V-3Ph-60Hz','230V-1Ph-50Hz','415V','415V-3Ph-50Hz',
  '460V-3Ph-60Hz','Air','Hydraulic','Manual',
];

const CONTROL_TYPE_OPTIONS = [
  'Automatic','Cab','Cab and Automatic','Hand controls','Hydraulic Levers','Manual',
  'Pendant','Pendant & Remote','Remote','Remote & Cab','Remote With Backup Pendant',
  'Wall mounted control stations',
];

const DUTY_CLASS_OPTIONS = ['C4 / M4','C4 / M5','C5 / M5'];
const ACCESS_OPTIONS = ['19FT SCISSOR','45FT EWP','SCISSOR'];
const CATEGORY_OPTIONS = ['Overhead Crane','Hoist','Chain Sling','Wire Rope Sling','Synthetic Sling','Below the Hook','Jib Crane','Gantry Crane','Monorail','KBK'];

const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "text-xs font-medium text-muted-foreground";

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-2 text-sm font-bold text-foreground">
      {title}
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}

export function AddAssetForm({ siteName, clientId, onSaved, onCancel }: AddAssetFormProps) {
  const [saving, setSaving] = useState(false);
  const [showCore, setShowCore] = useState(true);
  const [showAdditional, setShowAdditional] = useState(false);
  const [showHoist, setShowHoist] = useState(false);

  // System fields
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState('Overhead Crane');
  const [assetType, setAssetType] = useState('');
  const [status, setStatus] = useState('In Service');
  const [barcode, setBarcode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [locationName, setLocationName] = useState('');
  const [areaName, setAreaName] = useState('');

  // Core fields
  const [swlTonnes, setSwlTonnes] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [majorInspDueDate, setMajorInspDueDate] = useState('');
  const [criticalityLevel, setCriticalityLevel] = useState('');
  const [craneOpStatus, setCraneOpStatus] = useState('');
  const [envExposure, setEnvExposure] = useState('');
  const [liftHeight, setLiftHeight] = useState('');
  const [craneClassification, setCraneClassification] = useState('');
  const [designStandard, setDesignStandard] = useState('');
  const [powerSupply, setPowerSupply] = useState('');
  const [controlType, setControlType] = useState('');
  const [complianceStatus, setComplianceStatus] = useState('');
  const [serviceClass, setServiceClass] = useState('');
  const [commissionDate, setCommissionDate] = useState('');
  const [structuralLife, setStructuralLife] = useState('');
  const [majorInspInterval, setMajorInspInterval] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState('');
  const [replacementRisk, setReplacementRisk] = useState('');

  // Additional fields
  const [brandMake, setBrandMake] = useState('');
  const [yearManufactured, setYearManufactured] = useState('');
  const [dutyClass, setDutyClass] = useState('');
  const [accessSuggestion, setAccessSuggestion] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [notes, setNotes] = useState('');

  // Hoist & trolley
  const [configuration, setConfiguration] = useState('');
  const [hoistConfiguration, setHoistConfiguration] = useState('');
  const [hookType, setHookType] = useState('');
  const [pendantRemote, setPendantRemote] = useState('');
  const [pendantBrand, setPendantBrand] = useState('');
  const [trolleyConfig, setTrolleyConfig] = useState('');
  const [trolleySerial, setTrolleySerial] = useState('');
  const [mfgHoist1, setMfgHoist1] = useState('');
  const [modelHoist1, setModelHoist1] = useState('');
  const [serialHoist1, setSerialHoist1] = useState('');
  const [liftMedHoist1, setLiftMedHoist1] = useState('');
  const [mfgHoist2, setMfgHoist2] = useState('');
  const [modelHoist2, setModelHoist2] = useState('');
  const [serialHoist2, setSerialHoist2] = useState('');
  const [liftMedHoist2, setLiftMedHoist2] = useState('');

  const handleSave = async () => {
    if (!assetName.trim() || !assetType) {
      toast.error('Asset Name and Asset Type are required');
      return;
    }
    setSaving(true);

    const insertData: Record<string, any> = {
      class_name: category,
      description: assetName.trim(),
      asset_type: assetType,
      account_name: siteName,
      status,
      barcode: barcode.trim() || null,
      serial_number: serialNumber.trim() || null,
      location_name: locationName.trim() || null,
      area_name: areaName.trim() || null,
      // Core
      swl_tonnes: swlTonnes.trim() || null,
      capacity: swlTonnes.trim() || null,
      installation_date: installationDate || null,
      major_inspection_due_date: majorInspDueDate || null,
      asset_criticality_level: criticalityLevel || null,
      crane_operational_status: craneOpStatus || null,
      environment_exposure: envExposure || null,
      lift_height_m: liftHeight ? parseFloat(liftHeight) : null,
      length_lift: liftHeight.trim() || null,
      crane_classification: craneClassification || null,
      design_standard: designStandard || null,
      power_supply: powerSupply || null,
      power: powerSupply || null,
      control_type: controlType || null,
      compliance_status: complianceStatus || null,
      service_class_usage_intensity: serviceClass || null,
      commission_date: commissionDate || null,
      structural_design_life_years: structuralLife ? parseInt(structuralLife) : null,
      major_inspection_interval_years: majorInspInterval ? parseInt(majorInspInterval) : null,
      asset_lifecycle_stage: lifecycleStage || null,
      replacement_risk_category: replacementRisk || null,
      // Additional
      brand_make: brandMake || null,
      crane_manufacturer: brandMake || null,
      year_manufactured: yearManufactured ? parseInt(yearManufactured) : null,
      duty_class: dutyClass || null,
      access_suggestion: accessSuggestion || null,
      external_id: externalRef.trim() || null,
      notes: notes.trim() || null,
      urgent_note: notes.trim() || null,
      // Hoist & trolley
      configuration: configuration.trim() || null,
      hoist_configuration: hoistConfiguration.trim() || null,
      hook_type: hookType.trim() || null,
      pendant_remote: pendantRemote.trim() || null,
      pendant_brand: pendantBrand.trim() || null,
      trolley_configuration: trolleyConfig.trim() || null,
      trolley_serial: trolleySerial.trim() || null,
      manufacturer_hoist1: mfgHoist1.trim() || null,
      model_hoist1: modelHoist1.trim() || null,
      serial_hoist1: serialHoist1.trim() || null,
      lifting_medium_hoist1: liftMedHoist1.trim() || null,
      manufacturer_hoist2: mfgHoist2.trim() || null,
      model_hoist2: modelHoist2.trim() || null,
      serial_hoist2: serialHoist2.trim() || null,
      lifting_medium_hoist2: liftMedHoist2.trim() || null,
    };

    if (clientId) insertData.client_id = clientId;

    const { error } = await supabase.from('assets').insert(insertData as any);
    if (error) {
      toast.error(error.message || 'Failed to add asset');
    } else {
      toast.success('Asset added successfully');
      onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="p-4 border-t border-border bg-muted/30 space-y-3 max-h-[70vh] overflow-auto">
      <p className="font-bold text-base">New Asset</p>

      {/* ── System Fields ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">System</p>
        <div>
          <label className={labelClass}>Asset Name *</label>
          <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Bay 3 - 5T Overhead Crane" className={inputClass} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
              {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className={labelClass}>Asset Type *</label>
            <select value={assetType} onChange={e => setAssetType(e.target.value)} className={selectClass}>
              <option value="">Select type...</option>
              {ASSET_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Bar Code (RKA Asset ID) *</label>
            <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Serial Number</label>
            <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className={labelClass}>Location</label>
            <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Area</label>
            <input type="text" value={areaName} onChange={e => setAreaName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
            <option>In Service</option>
            <option>Out of Service</option>
            <option>Decommissioned</option>
          </select>
        </div>
      </div>

      {/* ── Core Fields ── */}
      <SectionHeader title="Core Details" open={showCore} onToggle={() => setShowCore(!showCore)} />
      {showCore && (
        <div className="space-y-2 pl-1 border-l-2 border-primary/20">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Safe Working Load (t) *</label>
              <input type="text" value={swlTonnes} onChange={e => setSwlTonnes(e.target.value)} placeholder="e.g. 5T" className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Lift Height (m)</label>
              <input type="number" value={liftHeight} onChange={e => setLiftHeight(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Installation Date *</label>
              <input type="date" value={installationDate} onChange={e => setInstallationDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Major Inspection Due *</label>
              <input type="date" value={majorInspDueDate} onChange={e => setMajorInspDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Criticality Level *</label>
              <select value={criticalityLevel} onChange={e => setCriticalityLevel(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Operational Status *</label>
              <select value={craneOpStatus} onChange={e => setCraneOpStatus(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>Operational</option><option>Non-Operational</option><option>Limited Use</option><option>Decommissioned</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Environment Exposure *</label>
            <select value={envExposure} onChange={e => setEnvExposure(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              <option>Indoor</option><option>Outdoor</option><option>Coastal</option><option>Chemical</option><option>High Temperature</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Power Supply</label>
              <select value={powerSupply} onChange={e => setPowerSupply(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {POWER_SUPPLY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Control Type</label>
              <select value={controlType} onChange={e => setControlType(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {CONTROL_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Crane Classification</label>
              <select value={craneClassification} onChange={e => setCraneClassification(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>C1</option><option>C2</option><option>C3</option><option>C4</option><option>C5</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Design Standard</label>
              <select value={designStandard} onChange={e => setDesignStandard(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>AS 1418</option><option>AS 2550</option><option>EN 13001</option><option>FEM</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Compliance Status</label>
              <select value={complianceStatus} onChange={e => setComplianceStatus(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>Compliant</option><option>Non-Compliant</option><option>Under Review</option>
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Service Class</label>
              <select value={serviceClass} onChange={e => setServiceClass(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>Light</option><option>Moderate</option><option>Heavy</option><option>Very Heavy</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Commission Date</label>
              <input type="date" value={commissionDate} onChange={e => setCommissionDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Design Life (years)</label>
              <input type="number" value={structuralLife} onChange={e => setStructuralLife(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Major Insp. Interval (years)</label>
              <input type="number" value={majorInspInterval} onChange={e => setMajorInspInterval(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Lifecycle Stage</label>
              <select value={lifecycleStage} onChange={e => setLifecycleStage(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option>New</option><option>Active</option><option>Ageing</option><option>End of Life</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Replacement Risk</label>
            <select value={replacementRisk} onChange={e => setReplacementRisk(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Additional Fields ── */}
      <SectionHeader title="Additional" open={showAdditional} onToggle={() => setShowAdditional(!showAdditional)} />
      {showAdditional && (
        <div className="space-y-2 pl-1 border-l-2 border-primary/20">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Brand / Make</label>
              <select value={brandMake} onChange={e => setBrandMake(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {BRAND_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Year Manufactured</label>
              <input type="number" value={yearManufactured} onChange={e => setYearManufactured(e.target.value)} placeholder="e.g. 2015" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Duty Class</label>
              <select value={dutyClass} onChange={e => setDutyClass(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {DUTY_CLASS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Access Suggestion</label>
              <select value={accessSuggestion} onChange={e => setAccessSuggestion(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {ACCESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>External Reference</label>
            <input type="text" value={externalRef} onChange={e => setExternalRef(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
      )}

      {/* ── Hoist & Trolley ── */}
      <SectionHeader title="Hoist & Trolley Details" open={showHoist} onToggle={() => setShowHoist(!showHoist)} />
      {showHoist && (
        <div className="space-y-2 pl-1 border-l-2 border-primary/20">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Configuration</label>
              <input type="text" value={configuration} onChange={e => setConfiguration(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Hoist Configuration</label>
              <input type="text" value={hoistConfiguration} onChange={e => setHoistConfiguration(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Hook Type</label>
              <input type="text" value={hookType} onChange={e => setHookType(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Pendant / Remote</label>
              <input type="text" value={pendantRemote} onChange={e => setPendantRemote(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Pendant Brand</label>
              <input type="text" value={pendantBrand} onChange={e => setPendantBrand(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Trolley Config</label>
              <input type="text" value={trolleyConfig} onChange={e => setTrolleyConfig(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Trolley Serial</label>
            <input type="text" value={trolleySerial} onChange={e => setTrolleySerial(e.target.value)} className={inputClass} />
          </div>

          <p className="text-xs font-bold text-muted-foreground mt-2">Hoist 1</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Manufacturer</label>
              <input type="text" value={mfgHoist1} onChange={e => setMfgHoist1(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Model</label>
              <input type="text" value={modelHoist1} onChange={e => setModelHoist1(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Serial</label>
              <input type="text" value={serialHoist1} onChange={e => setSerialHoist1(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Lifting Medium</label>
              <input type="text" value={liftMedHoist1} onChange={e => setLiftMedHoist1(e.target.value)} className={inputClass} />
            </div>
          </div>

          <p className="text-xs font-bold text-muted-foreground mt-2">Hoist 2</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Manufacturer</label>
              <input type="text" value={mfgHoist2} onChange={e => setMfgHoist2(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Model</label>
              <input type="text" value={modelHoist2} onChange={e => setModelHoist2(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Serial</label>
              <input type="text" value={serialHoist2} onChange={e => setSerialHoist2(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Lifting Medium</label>
              <input type="text" value={liftMedHoist2} onChange={e => setLiftMedHoist2(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ── Save / Cancel ── */}
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Asset'}
        </button>
        <button onClick={onCancel} className="flex-1 h-10 bg-muted rounded-lg text-muted-foreground font-medium text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
