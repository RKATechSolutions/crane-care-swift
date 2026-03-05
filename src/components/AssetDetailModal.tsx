import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Save, ChevronDown, ChevronUp, Camera, Plus, Trash2 } from 'lucide-react';

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
    main_photo_url?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "w-full h-10 px-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "text-xs font-medium text-muted-foreground";

const FALLBACK_CATEGORY_OPTIONS = ['Overhead Crane','Hoist','Chain Sling','Wire Rope Sling','Synthetic Sling','Below the Hook','Jib Crane','Gantry Crane','Monorail','Monorail WRH','Monorail CH','Portal DGWRH','Portal SGWRH','Portal Balancer','Air Jib CH','Jib Balancer','Manual','KBK'];

interface CategoryGroup {
  name: string;
  types: string[];
  fields: string[];
}

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [mainPhotoUrl, setMainPhotoUrl] = useState(asset.main_photo_url || '');
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; photo_url: string; caption: string | null }[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  // Category groups from admin config
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [allEquipmentTypes, setAllEquipmentTypes] = useState<string[]>(FALLBACK_CATEGORY_OPTIONS);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('admin_config').select('config').eq('id', 'lifting_register').maybeSingle().then(({ data }) => {
      if (data?.config) {
        const c = data.config as any;
        if (c.category_groups?.length) setCategoryGroups(c.category_groups);
        if (c.equipment_types?.length) setAllEquipmentTypes(c.equipment_types);
      }
    });
  }, []);

  // Determine which group the current className belongs to
  useEffect(() => {
    if (className && categoryGroups.length > 0 && !selectedGroup) {
      const found = categoryGroups.find(g => g.types.includes(className));
      if (found) setSelectedGroup(found.name);
    }
  }, [className, categoryGroups]);

  // Get types for selected group, or all types if no groups configured
  const typesForSelectedGroup = useMemo(() => {
    if (categoryGroups.length === 0) return allEquipmentTypes;
    if (!selectedGroup) return [];
    const group = categoryGroups.find(g => g.name === selectedGroup);
    return group?.types || [];
  }, [categoryGroups, selectedGroup, allEquipmentTypes]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `asset-photos/${asset.id}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('job-documents').upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('job-documents').getPublicUrl(path);
      const url = urlData.publicUrl;
      setMainPhotoUrl(url);
      await supabase.from('assets').update({ main_photo_url: url } as any).eq('id', asset.id);
      toast.success('Asset photo uploaded');
    } catch (err: any) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Load gallery photos
  useEffect(() => {
    const loadPhotos = async () => {
      const { data } = await supabase
        .from('asset_photos')
        .select('id, photo_url, caption')
        .eq('asset_id', asset.id)
        .order('created_at', { ascending: false });
      if (data) setGalleryPhotos(data as any);
    };
    loadPhotos();
  }, [asset.id]);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `asset-photos/${asset.id}_gallery_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('job-documents').upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('job-documents').getPublicUrl(path);
        await supabase.from('asset_photos').insert({
          asset_id: asset.id,
          photo_url: urlData.publicUrl,
          uploaded_by: 'technician',
        } as any);
      }
      // Refresh
      const { data } = await supabase
        .from('asset_photos')
        .select('id, photo_url, caption')
        .eq('asset_id', asset.id)
        .order('created_at', { ascending: false });
      if (data) setGalleryPhotos(data as any);
      toast.success('Photos added');
    } catch {
      toast.error('Failed to upload photos');
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleDeleteGalleryPhoto = async (photoId: string) => {
    await supabase.from('asset_photos').delete().eq('id', photoId);
    setGalleryPhotos(prev => prev.filter(p => p.id !== photoId));
    toast.success('Photo removed');
  };

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
      main_photo_url: mainPhotoUrl || null,
    } as any).eq('id', asset.id);

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
          {/* Main Asset Photo */}
          <div>
            <label className={labelClass}>Main Asset Photo</label>
            <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={handlePhotoUpload} />
            {mainPhotoUrl ? (
              <div className="relative mt-1">
                <img src={mainPhotoUrl} alt="Asset" className="w-full h-32 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-background/80 backdrop-blur rounded-lg px-2 py-1 text-xs font-medium flex items-center gap-1 border border-border"
                >
                  <Camera className="w-3 h-3" /> Replace
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="mt-1 w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">{uploadingPhoto ? 'Uploading…' : 'Add Asset Photo'}</span>
              </button>
            )}
          </div>
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

          {/* Asset Photo Gallery */}
          <SectionHeader title={`Asset Photos (${galleryPhotos.length})`} open={showGallery} onToggle={() => setShowGallery(!showGallery)} />
          {showGallery && (
            <div className="space-y-2 pl-1 border-l-2 border-primary/20">
              <input type="file" accept="image/*" multiple ref={galleryInputRef} className="hidden" onChange={handleGalleryUpload} />
              <div className="grid grid-cols-3 gap-2">
                {galleryPhotos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <img src={photo.photo_url} alt="Asset" className="w-full h-20 object-cover rounded-lg border border-border" />
                    <button
                      onClick={() => handleDeleteGalleryPhoto(photo.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingGallery}
                  className="w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px]">{uploadingGallery ? 'Uploading…' : 'Add Photos'}</span>
                </button>
              </div>
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
