import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Save, ChevronDown, ChevronUp } from 'lucide-react';

interface AssetDetailModalProps {
  asset: {
    id: string;
    class_name: string;
    asset_id1: string | null;
    asset_id2: string | null;
    status: string | null;
    account_name: string | null;
    location_name: string | null;
    area_name: string | null;
    description: string | null;
    asset_type: string | null;
    capacity: string | null;
    manufacturer: string | null;
    model_number: string | null;
    serial_number: string | null;
    length_lift: string | null;
    crane_manufacturer: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "text-xs font-medium text-muted-foreground";

const CATEGORY_OPTIONS = ['Overhead Crane','Hoist','Chain Sling','Wire Rope Sling','Synthetic Sling','Below the Hook','Jib Crane','Gantry Crane','Monorail','Monorail WRH','Monorail CH','Portal DGWRH','Portal SGWRH','Portal Balancer','Air Jib CH','Jib Balancer','Manual','KBK'];

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-2 text-sm font-bold text-foreground">
      {title}
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}

export function AssetDetailModal({ asset, onClose, onSaved }: AssetDetailModalProps) {
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Editable fields
  const [description, setDescription] = useState(asset.description || '');
  const [className, setClassName] = useState(asset.class_name || '');
  const [assetType, setAssetType] = useState(asset.asset_type || '');
  const [capacity, setCapacity] = useState(asset.capacity || '');
  const [serialNumber, setSerialNumber] = useState(asset.serial_number || '');
  const [manufacturer, setManufacturer] = useState(asset.crane_manufacturer || asset.manufacturer || '');
  const [locationName, setLocationName] = useState(asset.location_name || '');
  const [areaName, setAreaName] = useState(asset.area_name || '');
  const [status, setStatus] = useState(asset.status || 'In Service');
  const [lengthLift, setLengthLift] = useState(asset.length_lift || '');

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('assets').update({
      description: description.trim() || null,
      class_name: className,
      asset_type: assetType.trim() || null,
      capacity: capacity.trim() || null,
      serial_number: serialNumber.trim() || null,
      crane_manufacturer: manufacturer.trim() || null,
      manufacturer: manufacturer.trim() || null,
      location_name: locationName.trim() || null,
      area_name: areaName.trim() || null,
      status: status,
      length_lift: lengthLift.trim() || null,
    }).eq('id', asset.id);

    if (error) {
      toast.error(error.message || 'Failed to update');
    } else {
      toast.success('Asset updated');
      onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-background w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold text-base">Asset Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div>
            <label className={labelClass}>Description / Name</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Category</label>
              <select value={className} onChange={e => setClassName(e.target.value)} className={selectClass}>
                {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Type</label>
              <input type="text" value={assetType} onChange={e => setAssetType(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Capacity / SWL</label>
              <input type="text" value={capacity} onChange={e => setCapacity(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Manufacturer</label>
              <input type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Serial Number</label>
              <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
                <option>In Service</option>
                <option>Out of Service</option>
                <option>Decommissioned</option>
              </select>
            </div>
          </div>

          <SectionHeader title="Location & More" open={showMore} onToggle={() => setShowMore(!showMore)} />
          {showMore && (
            <div className="space-y-2 pl-1 border-l-2 border-primary/20">
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
                <label className={labelClass}>Length / Lift</label>
                <input type="text" value={lengthLift} onChange={e => setLengthLift(e.target.value)} className={inputClass} />
              </div>
              {asset.asset_id1 && (
                <div className="text-xs text-muted-foreground">Asset ID1: {asset.asset_id1}</div>
              )}
              {asset.asset_id2 && (
                <div className="text-xs text-muted-foreground">Asset ID2: {asset.asset_id2}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl font-bold text-sm bg-muted text-foreground">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
