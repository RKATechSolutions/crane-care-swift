import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Check, Pencil, AlertTriangle, Loader2, ScanLine, X, ImagePlus, Sparkles } from 'lucide-react';

const DEFAULT_EQUIPMENT_TYPES = [
  'Chain Sling', 'Wire Rope Sling', 'Web Sling', 'Shackle', 'Hook',
  'Lever Hoist', 'Chain Block', 'Beam Clamp', 'Spreader Beam',
  'Lifting Lug', 'Eyebolt', 'Swivel',
];
const DEFAULT_SLING_TYPES = ['Chain Sling', 'Wire Rope Sling', 'Web Sling'];
const DEFAULT_HOIST_TYPES = ['Lever Hoist', 'Chain Block'];
const DEFAULT_BEAM_TYPES = ['Beam Clamp', 'Spreader Beam'];
const DEFAULT_SLING_CONFIGS = ['Single Leg', 'Two Leg', 'Three Leg', 'Four Leg', 'Endless'];
const DEFAULT_EQUIPMENT_STATUSES = ['In Service', 'Failed', 'Removed From Service', 'Pending Inspection'];
const DEFAULT_WLL_UNITS = ['kg', 't'];

interface AIField {
  value: string | number | null;
  confidence: number;
  evidence_snippet?: string;
}

interface AIResult {
  equipment_type: AIField;
  manufacturer: AIField;
  model: AIField;
  serial_number: AIField;
  asset_tag: AIField;
  wll_value: AIField;
  wll_unit: AIField;
  length_m?: AIField;
  grade?: AIField;
  tag_present: AIField;
  wll_conflict: boolean;
  notes?: string;
  overall_confidence: number;
}

interface FieldStatus {
  accepted: boolean;
  edited: boolean;
  original?: string | number | null;
}

type FormData = {
  equipment_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  asset_tag: string;
  wll_value: string;
  wll_unit: string;
  length_m: string;
  grade: string;
  tag_present: string;
  equipment_status: string;
  sling_configuration: string;
  sling_leg_count: string;
  lift_height_m: string;
  span_m: string;
  notes: string;
  site_name: string;
};

interface LiftingRegisterFormProps {
  onBack: () => void;
  clientId?: string;
  siteName?: string;
}

const HIGH_RISK_FIELDS = ['equipment_type', 'wll_value', 'asset_tag', 'serial_number'];

export default function LiftingRegisterForm({ onBack, clientId, siteName }: LiftingRegisterFormProps) {
  const { state } = useApp();

  // Dynamic config from admin
  const [EQUIPMENT_TYPES, setEquipmentTypes] = useState(DEFAULT_EQUIPMENT_TYPES);
  const [SLING_TYPES, setSlingTypes] = useState(DEFAULT_SLING_TYPES);
  const [HOIST_TYPES, setHoistTypes] = useState(DEFAULT_HOIST_TYPES);
  const [BEAM_TYPES, setBeamTypes] = useState(DEFAULT_BEAM_TYPES);
  const [SLING_CONFIGS, setSlingConfigs] = useState(DEFAULT_SLING_CONFIGS);
  const [EQUIP_STATUSES, setEquipStatuses] = useState(DEFAULT_EQUIPMENT_STATUSES);
  const [WLL_UNITS, setWllUnits] = useState(DEFAULT_WLL_UNITS);

  useEffect(() => {
    supabase.from('admin_config').select('config').eq('id', 'lifting_register').single().then(({ data }) => {
      if (data?.config) {
        const c = data.config as any;
        if (c.equipment_types?.length) setEquipmentTypes(c.equipment_types);
        if (c.sling_types?.length) setSlingTypes(c.sling_types);
        if (c.hoist_types?.length) setHoistTypes(c.hoist_types);
        if (c.beam_types?.length) setBeamTypes(c.beam_types);
        if (c.sling_configurations?.length) setSlingConfigs(c.sling_configurations);
        if (c.equipment_statuses?.length) setEquipStatuses(c.equipment_statuses);
        if (c.wll_units?.length) setWllUnits(c.wll_units);
      }
    });
  }, []);

  const [form, setForm] = useState<FormData>({
    equipment_type: '', manufacturer: '', model: '', serial_number: '',
    asset_tag: '', wll_value: '', wll_unit: 'kg', length_m: '', grade: '',
    tag_present: 'unknown', equipment_status: 'In Service',
    sling_configuration: '', sling_leg_count: '', lift_height_m: '',
    span_m: '', notes: '', site_name: siteName || '',
  });

  // Photo state
  const [tagPhoto, setTagPhoto] = useState<string | null>(null);
  const [overallPhoto, setOverallPhoto] = useState<string | null>(null);
  const [stampPhoto, setStampPhoto] = useState<string | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  // AI state
  const [scanning, setScanning] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, FieldStatus>>({});
  const [saving, setSaving] = useState(false);

  const updateField = useCallback((key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Photo capture
  const capturePhoto = useCallback((slot: 'tag' | 'overall' | 'stamp') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (slot === 'tag') setTagPhoto(base64);
        else if (slot === 'overall') setOverallPhoto(base64);
        else setStampPhoto(base64);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  // AI Scan
  const runAIScan = useCallback(async () => {
    if (!tagPhoto || !overallPhoto) {
      toast.error('Tag and overall photos are required');
      return;
    }
    setScanning(true);
    try {
      const photos = [tagPhoto, overallPhoto];
      if (stampPhoto) photos.push(stampPhoto);

      const { data, error } = await supabase.functions.invoke('scan-lifting-equipment', {
        body: { photos, current_equipment_type: form.equipment_type || null },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult(data as AIResult);
      setScanModalOpen(false);
      setReviewMode(true);

      // Initialize field statuses
      const statuses: Record<string, FieldStatus> = {};
      const fields = ['equipment_type', 'manufacturer', 'model', 'serial_number', 'asset_tag', 'wll_value', 'wll_unit', 'grade', 'tag_present'];
      fields.forEach(f => {
        statuses[f] = { accepted: false, edited: false };
      });
      setFieldStatuses(statuses);
    } catch (err: any) {
      console.error('AI scan error:', err);
      toast.error(err.message || 'AI scan failed. You can still fill in fields manually.');
    } finally {
      setScanning(false);
    }
  }, [tagPhoto, overallPhoto, stampPhoto, form.equipment_type]);

  // Accept AI field
  const acceptField = useCallback((key: string) => {
    if (!aiResult) return;
    const field = (aiResult as any)[key] as AIField | undefined;
    if (!field) return;
    const value = field.value;
    if (value !== null && value !== undefined) {
      updateField(key as keyof FormData, String(value));
    }
    setFieldStatuses(prev => ({ ...prev, [key]: { accepted: true, edited: false } }));
  }, [aiResult, updateField]);

  // Accept all high-confidence fields
  const acceptAllHighConfidence = useCallback(() => {
    if (!aiResult) return;
    const fields = ['equipment_type', 'manufacturer', 'model', 'serial_number', 'asset_tag', 'wll_value', 'wll_unit', 'grade', 'tag_present'];
    fields.forEach(key => {
      const field = (aiResult as any)[key] as AIField | undefined;
      if (!field) return;
      const isHighRisk = HIGH_RISK_FIELDS.includes(key);
      if (field.confidence >= 85 && !isHighRisk) {
        if (field.value !== null && field.value !== undefined) {
          updateField(key as keyof FormData, String(field.value));
        }
        setFieldStatuses(prev => ({ ...prev, [key]: { accepted: true, edited: false } }));
      } else if (field.confidence >= 85 && isHighRisk) {
        // Pre-fill but still require confirmation
        if (field.value !== null && field.value !== undefined) {
          updateField(key as keyof FormData, String(field.value));
        }
      }
    });
    toast.success('High-confidence fields pre-filled. Confirm high-risk fields.');
  }, [aiResult, updateField]);

  // Check if required confirmations are done
  const canSave = useMemo(() => {
    if (!reviewMode) {
      return form.equipment_type !== '' && (form.serial_number !== '' || form.asset_tag !== '');
    }
    // In review mode, high-risk fields with values must be accepted or edited
    const hasId = form.serial_number || form.asset_tag;
    const typeSet = form.equipment_type !== '';
    return typeSet && !!hasId;
  }, [reviewMode, form]);

  // Conditional field visibility
  const isSling = SLING_TYPES.includes(form.equipment_type);
  const isHoist = HOIST_TYPES.includes(form.equipment_type);
  const isBeam = BEAM_TYPES.includes(form.equipment_type);

  // Save
  const handleSave = useCallback(async () => {
    if (!state.currentUser) return;
    setSaving(true);
    try {
      const record: any = {
        equipment_type: form.equipment_type,
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        asset_tag: form.asset_tag || null,
        wll_value: form.wll_value ? Number(form.wll_value) : null,
        wll_unit: form.wll_unit,
        length_m: form.length_m ? Number(form.length_m) : null,
        grade: form.grade || null,
        tag_present: form.tag_present,
        equipment_status: form.equipment_status,
        sling_configuration: isSling ? (form.sling_configuration || null) : null,
        sling_leg_count: isSling && form.sling_leg_count ? Number(form.sling_leg_count) : null,
        lift_height_m: isHoist && form.lift_height_m ? Number(form.lift_height_m) : null,
        span_m: isBeam && form.span_m ? Number(form.span_m) : null,
        notes: form.notes || null,
        site_name: form.site_name || null,
        client_id: clientId || null,
        tag_photo_url: tagPhoto || null,
        overall_photo_url: overallPhoto || null,
        stamp_photo_url: stampPhoto || null,
        ai_scan_used: !!aiResult,
        ai_scan_timestamp: aiResult ? new Date().toISOString() : null,
        ai_confidence_summary: aiResult ? {
          overall: aiResult.overall_confidence,
          wll_conflict: aiResult.wll_conflict,
          fields: Object.fromEntries(
            ['equipment_type', 'manufacturer', 'model', 'serial_number', 'asset_tag', 'wll_value']
              .map(k => [k, (aiResult as any)[k]?.confidence ?? null])
          ),
        } : {},
        registered_by_id: state.currentUser.id,
        registered_by_name: state.currentUser.name,
      };

      const { data: inserted, error } = await supabase
        .from('lifting_register')
        .insert(record)
        .select('id')
        .single();

      if (error) throw error;

      // Save audit scan record if AI was used
      if (aiResult && inserted) {
        await supabase.from('lifting_register_scans').insert([{
          register_id: inserted.id,
          technician_id: state.currentUser.id,
          technician_name: state.currentUser.name,
          photos: [tagPhoto, overallPhoto, stampPhoto].filter(Boolean) as any,
          ai_raw_response: aiResult as any,
          fields_accepted: Object.entries(fieldStatuses)
            .filter(([, st]) => st.accepted && !st.edited)
            .map(([k]) => k) as any,
          fields_edited: Object.entries(fieldStatuses)
            .filter(([, st]) => st.edited)
            .map(([k, st]) => ({ key: k, original: st.original })) as any,
          fields_discarded: Object.entries(fieldStatuses)
            .filter(([, st]) => !st.accepted && !st.edited)
            .map(([k]) => k) as any,
          overall_confidence: aiResult.overall_confidence,
        }]);
      }

      toast.success('Equipment registered successfully');
      onBack();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [form, state.currentUser, tagPhoto, overallPhoto, stampPhoto, aiResult, fieldStatuses, isSling, isHoist, isBeam, onBack]);

  // Confidence badge
  const ConfBadge = ({ confidence }: { confidence: number }) => (
    <Badge variant={confidence >= 85 ? 'default' : 'destructive'} className="text-[10px] ml-2">
      {confidence}%
    </Badge>
  );

  // AI Review field row
  const AIFieldRow = ({ fieldKey, label }: { fieldKey: string; label: string }) => {
    if (!aiResult) return null;
    const field = (aiResult as any)[fieldKey] as AIField | undefined;
    if (!field || field.value === null || field.value === undefined) return null;
    const status = fieldStatuses[fieldKey];
    const isHighRisk = HIGH_RISK_FIELDS.includes(fieldKey);
    const needsConfirm = isHighRisk && field.confidence < 85;

    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${status?.accepted ? 'border-green-500/30 bg-green-500/5' : needsConfirm ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium text-sm truncate">{String(field.value)}</p>
          {field.evidence_snippet && (
            <p className="text-[10px] text-muted-foreground italic mt-0.5">"{field.evidence_snippet}"</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <ConfBadge confidence={field.confidence} />
          {!status?.accepted ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => acceptField(fieldKey)}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                updateField(fieldKey as keyof FormData, String(field.value));
                setFieldStatuses(prev => ({
                  ...prev,
                  [fieldKey]: { accepted: true, edited: true, original: field.value },
                }));
                setReviewMode(false);
                setTimeout(() => {
                  document.getElementById(`field-${fieldKey}`)?.focus();
                }, 100);
              }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Check className="w-4 h-4 text-green-600" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Register Lifting Equipment" onBack={onBack} />

      <div className="flex-1 p-4 space-y-4 pb-24">
        {/* Section 1: AI Scan */}
        <Card className="p-4">
          <h2 className="font-bold text-base mb-1">Equipment Identification</h2>
          <Button
            onClick={() => setScanModalOpen(true)}
            className="w-full mt-2 bg-primary text-primary-foreground"
            size="lg"
          >
            <ScanLine className="w-5 h-5 mr-2" />
            Scan from Photos
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            Take 2–3 photos of the tag and item. AI will suggest values. You must confirm.
          </p>
        </Card>

        {/* AI Review Panel */}
        {reviewMode && aiResult && (
          <Card className="p-4 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">AI Suggestions</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {aiResult.overall_confidence}% overall
                </Badge>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={acceptAllHighConfidence}>
                Accept All High Confidence
              </Button>
            </div>

            {aiResult.wll_conflict && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">Conflicting WLL detected — manual entry required</p>
              </div>
            )}

            {aiResult.tag_present?.value === 'false' && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-700">Tag missing detected</p>
                  <p className="text-[10px] text-amber-600">Consider creating a defect for missing/illegible tag</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <AIFieldRow fieldKey="equipment_type" label="Equipment Type" />
              <AIFieldRow fieldKey="manufacturer" label="Manufacturer" />
              <AIFieldRow fieldKey="model" label="Model" />
              <AIFieldRow fieldKey="serial_number" label="Serial Number" />
              <AIFieldRow fieldKey="asset_tag" label="Asset Tag" />
              <AIFieldRow fieldKey="wll_value" label="WLL Value" />
              <AIFieldRow fieldKey="wll_unit" label="WLL Unit" />
              <AIFieldRow fieldKey="grade" label="Grade" />
              <AIFieldRow fieldKey="tag_present" label="Tag Present" />
            </div>

            {aiResult.notes && (
              <p className="text-xs text-muted-foreground mt-3 italic">AI Notes: {aiResult.notes}</p>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 text-xs"
              onClick={() => setReviewMode(false)}
            >
              Close Review & Edit Manually
            </Button>
          </Card>
        )}

        {/* Photo thumbnails (always visible if captured) */}
        {(tagPhoto || overallPhoto || stampPhoto) && (
          <div className="flex gap-2">
            {[
              { photo: tagPhoto, label: 'Tag' },
              { photo: overallPhoto, label: 'Item' },
              { photo: stampPhoto, label: 'Stamp' },
            ].map(({ photo, label }) =>
              photo ? (
                <div key={label} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                  <img src={photo} alt={label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">{label}</span>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Section 2: Manual Fields */}
        <Card className="p-4 space-y-3">
          <h3 className="font-bold text-sm">Equipment Details</h3>

          <div>
            <Label className="text-xs">Site Name</Label>
            <Input id="field-site_name" value={form.site_name} onChange={e => updateField('site_name', e.target.value)} placeholder="Enter site name" />
          </div>

          <div>
            <Label className="text-xs">Equipment Type *</Label>
            <Select value={form.equipment_type} onValueChange={v => updateField('equipment_type', v)}>
              <SelectTrigger id="field-equipment_type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Manufacturer</Label>
              <Input id="field-manufacturer" value={form.manufacturer} onChange={e => updateField('manufacturer', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input id="field-model" value={form.model} onChange={e => updateField('model', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Serial Number</Label>
              <Input id="field-serial_number" value={form.serial_number} onChange={e => updateField('serial_number', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Asset Tag / ID</Label>
              <Input id="field-asset_tag" value={form.asset_tag} onChange={e => updateField('asset_tag', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">WLL (Working Load Limit) *</Label>
              <Input id="field-wll_value" type="number" value={form.wll_value} onChange={e => updateField('wll_value', e.target.value)} placeholder="e.g. 5" />
            </div>
            <div>
              <Label className="text-xs">Unit</Label>
              <Select value={form.wll_unit} onValueChange={v => updateField('wll_unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="t">t</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Grade</Label>
            <Input id="field-grade" value={form.grade} onChange={e => updateField('grade', e.target.value)} placeholder="e.g. Grade 80" />
          </div>

          <div>
            <Label className="text-xs">Tag Present</Label>
            <Select value={form.tag_present} onValueChange={v => updateField('tag_present', v)}>
              <SelectTrigger id="field-tag_present"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="illegible">Illegible</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Equipment Status</Label>
            <Select value={form.equipment_status} onValueChange={v => updateField('equipment_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="In Service">In Service</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Removed From Service">Removed From Service</SelectItem>
                <SelectItem value="Pending Inspection">Pending Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Conditional: Sling fields */}
        {isSling && (
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm">Sling Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Configuration</Label>
                <Select value={form.sling_configuration} onValueChange={v => updateField('sling_configuration', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Leg">Single Leg</SelectItem>
                    <SelectItem value="Two Leg">Two Leg</SelectItem>
                    <SelectItem value="Three Leg">Three Leg</SelectItem>
                    <SelectItem value="Four Leg">Four Leg</SelectItem>
                    <SelectItem value="Endless">Endless</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Number of Legs</Label>
                <Input type="number" value={form.sling_leg_count} onChange={e => updateField('sling_leg_count', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Length (m)</Label>
              <Input type="number" step="0.1" value={form.length_m} onChange={e => updateField('length_m', e.target.value)} />
            </div>
          </Card>
        )}

        {/* Conditional: Hoist fields */}
        {isHoist && (
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm">Hoist Details</h3>
            <div>
              <Label className="text-xs">Lift Height (m)</Label>
              <Input type="number" step="0.1" value={form.lift_height_m} onChange={e => updateField('lift_height_m', e.target.value)} />
            </div>
          </Card>
        )}

        {/* Conditional: Beam fields */}
        {isBeam && (
          <Card className="p-4 space-y-3">
            <h3 className="font-bold text-sm">Beam / Spreader Details</h3>
            <div>
              <Label className="text-xs">Span (m)</Label>
              <Input type="number" step="0.1" value={form.span_m} onChange={e => updateField('span_m', e.target.value)} />
            </div>
          </Card>
        )}

        {/* Notes */}
        <Card className="p-4">
          <Label className="text-xs">Notes</Label>
          <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Any additional observations..." rows={3} />
        </Card>
      </div>

      {/* Fixed bottom save */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Cancel</Button>
        <Button className="flex-1" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Save Equipment
        </Button>
      </div>

      {/* Photo Capture Modal */}
      <Dialog open={scanModalOpen} onOpenChange={setScanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" /> Scan from Photos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tag Photo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tag / ID Plate Photo <span className="text-destructive">*</span></Label>
              {tagPhoto ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={tagPhoto} alt="Tag" className="w-full h-full object-cover" />
                  <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => setTagPhoto(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => capturePhoto('tag')}>
                  <ImagePlus className="w-5 h-5 mr-2" /> Capture Tag Photo
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground">Avoid glare, fill the frame, use flash if needed, take close-up.</p>
            </div>

            {/* Overall Photo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Overall Item Photo <span className="text-destructive">*</span></Label>
              {overallPhoto ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={overallPhoto} alt="Overall" className="w-full h-full object-cover" />
                  <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => setOverallPhoto(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => capturePhoto('overall')}>
                  <ImagePlus className="w-5 h-5 mr-2" /> Capture Overall Photo
                </Button>
              )}
            </div>

            {/* Stamp Photo (optional) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Serial / Stamp Close-up <span className="text-muted-foreground text-xs">(Optional)</span></Label>
              {stampPhoto ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                  <img src={stampPhoto} alt="Stamp" className="w-full h-full object-cover" />
                  <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => setStampPhoto(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => capturePhoto('stamp')}>
                  <ImagePlus className="w-5 h-5 mr-2" /> Capture Stamp Photo
                </Button>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!tagPhoto || !overallPhoto || scanning}
              onClick={runAIScan}
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Analysing Photos...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyse with AI
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
