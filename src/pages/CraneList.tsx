import { useApp } from '@/contexts/AppContext';
import { sortAssetsNumerically } from '@/utils/sorting';
import { AppHeader } from '@/components/AppHeader';
import { NoteToAdminModal } from '@/components/NoteToAdminModal';
import { useState, useEffect } from 'react';
import { PlayCircle, Package, Plus, Pencil, RefreshCw, FileText, X, ClipboardList, BarChart3, Link2, Users, FileBarChart, Briefcase, DollarSign, AlertCircle, BookOpen, Download, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SiteAssessmentForm from '@/pages/SiteAssessmentForm';
import CraneBaselineForm from '@/pages/CraneBaselineForm';
import DbInspectionForm from '@/pages/DbInspectionForm';
import { generateInspectionPdf } from '@/utils/generateInspectionPdf';
import JSZip from 'jszip';
import RepairBreakdownForm from '@/pages/RepairBreakdownForm';
import LiftingRegisterForm from '@/pages/LiftingRegisterForm';
import { Crane, InspectionItemResult, InspectionTemplate } from '@/types/inspection';
import { AddAssetForm } from '@/components/AddAssetForm';
import { AssetDetailModal } from '@/components/AssetDetailModal';
import { LiftingRegisterList } from '@/components/LiftingRegisterList';
import { LiftingRegisterInspectionForm } from '@/components/LiftingRegisterInspectionForm';
import { ClientDetailSection } from '@/components/ClientDetailSection';

interface DbAsset {
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
  main_photo_url: string | null;
}

type ClientTab = 'details' | 'assets' | 'quotes' | 'reports' | 'jobs';

interface CraneListProps {
  activeJobId?: string | null;
  onSetActiveJob?: (id: string | null) => void;
  initialTab?: ClientTab;
}

export default function CraneList({ activeJobId, onSetActiveJob, initialTab }: CraneListProps = {}) {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ClientTab>(initialTab || 'assets');
  const [noteOpen, setNoteOpen] = useState(false);
  const [dbAssets, setDbAssets] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DbAsset | null>(null);
  const [showAssessment, setShowAssessment] = useState<null | { type: 'Initial Site Baseline' | '12-Month Review'; existingId?: string }>(null);
  const [showSiteInspectionV2, setShowSiteInspectionV2] = useState(false);
  const [initialAssessment, setInitialAssessment] = useState<{ id: string; status: string } | null>(null);
  const [templatePickerCrane, setTemplatePickerCrane] = useState<Crane | null>(null);
  const [dbFormTemplates, setDbFormTemplates] = useState<{ form_id: string; form_name: string; description: string | null }[]>([]);
  const [activeDbForm, setActiveDbForm] = useState<{ formId: string; crane: Crane; assetId?: string } | null>(null);
  const [showLiftingRegister, setShowLiftingRegister] = useState(false);
  const [showLiftingRegisterList, setShowLiftingRegisterList] = useState(false);
  const [showLiftingInspection, setShowLiftingInspection] = useState(false);
  const [showBaseline, setShowBaseline] = useState<{ existingId?: string } | null>(null);
  const [existingBaseline, setExistingBaseline] = useState<{ id: string; status: string } | null>(null);
  const [clientQuotes, setClientQuotes] = useState<any[]>([]);
  const [clientJobs, setClientJobs] = useState<any[]>([]);
  const [showJobPrompt, setShowJobPrompt] = useState(false);
  const [pendingFormAction, setPendingFormAction] = useState<(() => void) | null>(null);
  const [activeJobName, setActiveJobName] = useState<string | null>(null);
  const [clientReports, setClientReports] = useState<any[]>([]);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [downloadingReports, setDownloadingReports] = useState(false);
  const [notebookLmLink, setNotebookLmLink] = useState<string>('');
  const [showNotebookLmEdit, setShowNotebookLmEdit] = useState(false);
  const [notebookLmInput, setNotebookLmInput] = useState('');
  const site = state.selectedSite;

  // Fetch active job name
  useEffect(() => {
    if (!activeJobId) { setActiveJobName(null); return; }
    supabase.from('tasks').select('title').eq('id', activeJobId).single().then(({ data }) => {
      if (data) setActiveJobName(data.title);
    });
  }, [activeJobId]);

  useEffect(() => {
    const fetchForms = async () => {
      const { data } = await supabase.from('form_templates').select('form_id, form_name, description').eq('active', true);
      if (data) setDbFormTemplates(data);
    };
    fetchForms();
  }, []);

  // Fetch existing site assessments
  useEffect(() => {
    if (!site) return;
    const fetchAssessment = async () => {
      const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
      let query = supabase.from('site_assessments').select('id, status, assessment_type').eq('assessment_type', 'Initial Site Baseline');
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('site_name', site.name);
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        setInitialAssessment({ id: data[0].id, status: data[0].status });
      } else {
        setInitialAssessment(null);
      }
    };
    fetchAssessment();
  }, [site?.id, site?.name]);

  // Fetch existing crane baseline
  useEffect(() => {
    if (!site) return;
    const fetchBaseline = async () => {
      const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
      let query = supabase.from('crane_baselines').select('id, status');
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('site_name', site.name);
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        setExistingBaseline({ id: data[0].id, status: data[0].status });
      } else {
        setExistingBaseline(null);
      }
    };
    fetchBaseline();
  }, [site?.id, site?.name]);

  // Fetch notebook LM link
  useEffect(() => {
    if (!site) return;
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    if (!clientId) return;
    supabase.from('clients').select('notebook_lm_link').eq('id', clientId).single().then(({ data }) => {
      if (data?.notebook_lm_link) setNotebookLmLink(data.notebook_lm_link);
    });
  }, [site?.id]);

  // Fetch quotes, jobs, reports for this client
  useEffect(() => {
    if (!site) return;
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    const siteName = site.name;

    const fetchQuotes = async () => {
      const { data } = await supabase.from('quotes').select('id, quote_number, client_name, status, total, created_at, asset_name').ilike('client_name', `%${siteName.split(' - ')[0]}%`).order('created_at', { ascending: false });
      if (data) setClientQuotes(data);
    };
    const fetchJobs = async () => {
      const { data } = await supabase.from('tasks').select('id, title, status, job_type, scheduled_date, created_at, client_name').ilike('client_name', `%${siteName.split(' - ')[0]}%`).order('created_at', { ascending: false });
      if (data) setClientJobs(data);
    };
    const fetchReports = async () => {
      let query = supabase.from('db_inspections').select('id, asset_id, asset_name, inspection_date, status, technician_name, crane_status, form_id');
      if (clientId) query = query.eq('client_id', clientId);
      else query = query.eq('site_name', siteName);
      const { data } = await query.order('created_at', { ascending: false });
      if (data) setClientReports(data);
    };
    fetchQuotes();
    fetchJobs();
    fetchReports();
  }, [site?.id, site?.name]);

  useEffect(() => {
    if (!site) {
      setLoading(false);
      return;
    }
    const fetchAssets = async () => {
      setLoading(true);
      const selectFields = 'id, class_name, asset_id1, asset_id2, status, account_name, location_name, area_name, description, asset_type, capacity, manufacturer, model_number, serial_number, length_lift, crane_manufacturer, main_photo_url';

      // 1. Try client_id if this is a DB client site
      if (site.id.startsWith('db-')) {
        const clientId = site.id.replace('db-', '');
        const { data } = await supabase
          .from('assets')
          .select(selectFields)
          .eq('client_id', clientId)
          .order('class_name');

        if (data && data.length > 0) {
          setDbAssets(sortAssetsNumerically(data, 'class_name'));
          setLoading(false);
          return;
        }
      }

      // 2. Look up client by name match, then query assets by client_id
      const { data: clients } = await supabase
        .from('clients')
        .select('id, client_name');

      if (clients) {
        const siteLower = site.name.toLowerCase();
        const matchedClient = clients.find(c => {
          const cl = c.client_name.toLowerCase();
          return cl === siteLower || 
                 cl.includes(siteLower) || 
                 siteLower.includes(cl) ||
                 cl.startsWith(siteLower.split(' - ')[0].toLowerCase()) ||
                 siteLower.startsWith(cl.split(' ')[0]);
        });

        if (matchedClient) {
          const { data } = await supabase
            .from('assets')
            .select(selectFields)
            .or(`client_id.eq.${matchedClient.id},account_name.ilike.%${matchedClient.client_name}%`)
            .order('class_name');

          if (data && data.length > 0) {
            setDbAssets(sortAssetsNumerically(data, 'class_name'));
            setLoading(false);
            return;
          }
        }
      }

      // 3. Fallback: direct account_name search
      const searchTerms = [site.name, site.name.split(' - ')[0]];
      for (const term of searchTerms) {
        if (term.length < 3) continue;
        const { data } = await supabase
          .from('assets')
          .select(selectFields)
          .ilike('account_name', `%${term}%`)
          .order('class_name');

        if (data && data.length > 0) {
          setDbAssets(data);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    };

    fetchAssets();
  }, [site?.name, site?.id]);

  // Convert DB assets to Crane objects for inspection compatibility
  if (!site) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No site selected</p>
      </div>
    );
  }

  const LIFTING_EQUIPMENT_CLASSES = ['Sling', 'Shackle', 'Spreader Beam', 'Lifting Clamp', 'Chain Block', 'Lever Hoist', 'Lifting Equipment'];

  const assetToCrane = (asset: DbAsset): Crane => {
    const isOverhead = asset.class_name === 'Overhead Crane';
    const isLiftingEquipment = LIFTING_EQUIPMENT_CLASSES.some(c => asset.class_name.toLowerCase().includes(c.toLowerCase()));
    return {
      id: `asset-${asset.id}`,
      siteId: site.id,
      name: asset.asset_id2 || asset.description || asset.asset_id1 || asset.class_name,
      type: isOverhead ? 'Single Girder Overhead' : isLiftingEquipment ? 'Lifting Equipment' : asset.class_name as any,
      serialNumber: asset.serial_number || asset.asset_id1 || 'N/A',
      capacity: asset.capacity || 'N/A',
      manufacturer: asset.crane_manufacturer || asset.manufacturer || 'N/A',
      yearInstalled: 0,
    };
  };

  // Use DB assets if available, otherwise fall back to mock cranes
  const displayAssets = dbAssets.length > 0 ? dbAssets : [];
  const mockCranes = site.cranes || [];
  const hasDbAssets = dbAssets.length > 0;

  const handleStartInspection = (crane: Crane) => {
    // If there's an existing in-progress inspection, resume it directly
    const existing = state.inspections.find(
      i => i.craneId === crane.id && i.status !== 'completed'
    );
    if (existing) {
      dispatch({ type: 'SELECT_CRANE', payload: { crane } });
      dispatch({ type: 'START_INSPECTION', payload: existing });
      return;
    }
    // Show template picker
    setTemplatePickerCrane(crane);
  };

  const startInspectionWithTemplate = (crane: Crane, template: InspectionTemplate) => {
    dispatch({ type: 'SELECT_CRANE', payload: { crane } });
    setTemplatePickerCrane(null);

    const items: InspectionItemResult[] = template.sections.flatMap(section =>
      section.items.map(item => ({
        templateItemId: item.id,
        sectionId: section.id,
        ...(item.type === 'numeric' ? { result: 'pass' as const } : {}),
      }))
    );

    dispatch({
      type: 'START_INSPECTION',
      payload: {
        id: `insp-${Date.now()}`,
        siteId: site.id,
        craneId: crane.id,
        templateId: template.id,
        templateVersion: template.version,
        technicianId: state.currentUser!.id,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        items,
      },
    });
  };

  const getInspectionStatus = (craneId: string) => {
    return state.inspections.find(i => i.craneId === craneId);
  };

  const refreshAssets = async () => {
    const selectFields = 'id, class_name, asset_id1, asset_id2, status, account_name, location_name, area_name, description, asset_type, capacity, manufacturer, model_number, serial_number, length_lift, crane_manufacturer, main_photo_url';
    const cId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    if (cId) {
      const { data } = await supabase.from('assets').select(selectFields).eq('client_id', cId).order('class_name');
      if (data && data.length > 0) { setDbAssets(data); return; }
    }
    const { data } = await supabase.from('assets').select(selectFields).ilike('account_name', `%${site.name}%`).order('class_name');
    if (data) setDbAssets(data);
  };

  const refreshReports = async () => {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
    let query = supabase.from('db_inspections').select('id, asset_id, asset_name, inspection_date, status, technician_name, crane_status, form_id, ai_summary, site_name, other_notes');
    if (clientId) query = query.eq('client_id', clientId);
    else query = query.eq('site_name', site.name);
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setClientReports(data);
  };

  const handleDeleteReport = async (reportId: string) => {
    setDeleting(true);
    try {
      // Delete responses first, then the inspection
      await supabase.from('inspection_responses').delete().eq('inspection_id', reportId);
      const { error } = await supabase.from('db_inspections').delete().eq('id', reportId);
      if (error) throw error;
      toast({ title: 'Report deleted', description: 'The inspection report has been removed.' });
      setClientReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
    setDeleting(false);
    setDeletingReportId(null);
  };


  const groupedAssets = displayAssets.reduce((acc, asset) => {
    const key = asset.class_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {} as Record<string, DbAsset[]>);

  // Show lifting inspection form
  if (showLiftingInspection) {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : undefined;
    return (
      <LiftingRegisterInspectionForm
        clientId={clientId}
        siteName={site.name}
        clientName={site.name}
        onBack={() => { setShowLiftingInspection(false); setShowLiftingRegisterList(true); }}
      />
    );
  }

  // Show lifting register list
  if (showLiftingRegisterList) {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : undefined;
    return (
      <LiftingRegisterList
        clientId={clientId}
        siteName={site.name}
        clientName={site.name}
        onBack={() => setShowLiftingRegisterList(false)}
        onAddNew={() => {
          setShowLiftingRegisterList(false);
          setShowLiftingRegister(true);
        }}
        onInspect={() => {
          setShowLiftingRegisterList(false);
          setShowLiftingInspection(true);
        }}
      />
    );
  }

  // Show lifting register form
  if (showLiftingRegister) {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : undefined;
    return <LiftingRegisterForm onBack={() => { setShowLiftingRegister(false); setShowLiftingRegisterList(true); }} clientId={clientId} siteName={site.name} />;
  }

  // Show DB-driven inspection form
  if (activeDbForm) {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : undefined;

    // Route repair/breakdown form to dedicated component
    if (activeDbForm.formId === 'FORM-RB1') {
      return (
        <RepairBreakdownForm
          assetName={activeDbForm.crane.name}
          assetId={activeDbForm.assetId}
          clientId={clientId}
          siteName={site.name}
          taskId={activeJobId || undefined}
          onBack={() => setActiveDbForm(null)}
        />
      );
    }

    return (
      <DbInspectionForm
        formId={activeDbForm.formId}
        assetName={activeDbForm.crane.name}
        assetId={activeDbForm.assetId}
        clientId={clientId}
        siteName={site.name}
        existingInspectionId={editingReportId || undefined}
        taskId={activeJobId || undefined}
        onBack={() => { setActiveDbForm(null); setEditingReportId(null); refreshReports(); }}
        onSubmitComplete={() => {
          setActiveDbForm(null);
          setEditingReportId(null);
          refreshReports();
        }}
      />
    );
  }

  // Show Site Inspection V2 form
  if (showSiteInspectionV2) {
    const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : undefined;
    return (
      <DbInspectionForm
        formId="FORM-ISI-V2"
        assetName={site.name}
        clientId={clientId}
        siteName={site.name}
        onBack={() => setShowSiteInspectionV2(false)}
        onSubmitComplete={() => {
          setShowSiteInspectionV2(false);
        }}
      />
    );
  }

  // Show crane baseline form
  if (showBaseline) {
    const refreshBaseline = async () => {
      const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
      let query = supabase.from('crane_baselines').select('id, status');
      if (clientId) query = query.eq('client_id', clientId);
      else query = query.eq('site_name', site.name);
      const { data } = await query.order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) setExistingBaseline({ id: data[0].id, status: data[0].status });
    };
    return (
      <CraneBaselineForm
        existingId={showBaseline.existingId}
        onBack={() => { setShowBaseline(null); refreshBaseline(); }}
      />
    );
  }

  // Show assessment form if selected
  if (showAssessment) {
    const refreshAssessment = async () => {
      const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
      let query = supabase.from('site_assessments').select('id, status, assessment_type').eq('assessment_type', 'Initial Site Baseline');
      if (clientId) query = query.eq('client_id', clientId);
      else query = query.eq('site_name', site.name);
      const { data } = await query.order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) setInitialAssessment({ id: data[0].id, status: data[0].status });
    };
    return (
      <SiteAssessmentForm
        assessmentType={showAssessment.type}
        existingId={showAssessment.existingId}
        onBack={() => { setShowAssessment(null); refreshAssessment(); }}
      />
    );
  }

  const clientId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;

  const TAB_ITEMS: { key: ClientTab; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details', icon: <Users className="w-4 h-4" /> },
    { key: 'assets', label: 'Assets', icon: <Package className="w-4 h-4" /> },
    { key: 'quotes', label: 'Quotes', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
    { key: 'jobs', label: 'Jobs', icon: <Briefcase className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader
        title={site.name}
        subtitle={hasDbAssets ? `${dbAssets.length} assets` : `${mockCranes.length} cranes`}
        onBack={() => dispatch({ type: 'BACK_TO_SITES' })}
        onNoteToAdmin={() => setNoteOpen(true)}
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
        {TAB_ITEMS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 px-1 text-[11px] font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab: Client Details */}
      {activeTab === 'details' && clientId && (
        <ClientDetailSection clientId={clientId} />
      )}
      {activeTab === 'details' && !clientId && (
        <div className="p-8 text-center text-muted-foreground">
          <p className="font-medium">No client record linked</p>
          <p className="text-sm mt-1">This site doesn't have a database client record</p>
        </div>
      )}

      {/* Tab: Assets */}
      {activeTab === 'assets' && (
        <>
          {/* Active Job Banner */}
          {activeJobId && activeJobName && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary truncate">Active Job: {activeJobName}</p>
                <p className="text-[10px] text-primary/70">All forms will be linked to this job</p>
              </div>
            </div>
          )}
          {!activeJobId && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-700">No active job</p>
                <p className="text-[10px] text-amber-600/80">Select a job from the Jobs tab to link forms</p>
              </div>
              <button
                onClick={() => setShowJobPrompt(true)}
                className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md flex-shrink-0"
              >
                Link Job
              </button>
            </div>
          )}
          {/* Quick Action Tiles */}
          <div className="px-4 pt-3 pb-2 grid grid-cols-5 gap-2">
            <button
              onClick={() => setShowBaseline({ existingId: existingBaseline?.id })}
              className="rounded-xl bg-muted flex flex-col items-center justify-center gap-1 p-2 text-center active:scale-[0.97] transition-all"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-bold leading-tight text-foreground mt-0.5">Site Inspection</span>
            </button>
            <button
              onClick={() => setShowLiftingRegisterList(true)}
              className="rounded-xl bg-muted flex flex-col items-center justify-center gap-1 p-2 text-center active:scale-[0.97] transition-all"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600">
                <ClipboardList className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-bold leading-tight text-foreground mt-0.5">Lifting Register</span>
            </button>
            <button
              onClick={async () => {
                if (existingBaseline?.id) {
                  const url = `${window.location.origin}/baseline?id=${existingBaseline.id}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: 'Link Copied', description: 'Customer pre-visit link copied to clipboard.' });
                } else {
                  const cId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
                  const payload: any = { site_name: site.name, company_name: site.name, status: 'in_progress' };
                  if (cId) payload.client_id = cId;
                  const { data } = await supabase.from('crane_baselines').insert(payload).select('id').single();
                  if (data) {
                    setExistingBaseline({ id: data.id, status: 'in_progress' });
                    const url = `${window.location.origin}/baseline?id=${data.id}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: 'Link Created & Copied', description: 'Customer pre-visit link copied to clipboard.' });
                  }
                }
              }}
              className="rounded-xl bg-muted flex flex-col items-center justify-center gap-1 p-2 text-center active:scale-[0.97] transition-all"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600">
                <Link2 className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-bold leading-tight text-foreground mt-0.5">Pre-Visit Link</span>
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SELECT_CRANE', payload: { crane: { id: '__site_summary__' } as any } });
              }}
              className="rounded-xl bg-muted flex flex-col items-center justify-center gap-1 p-2 text-center active:scale-[0.97] transition-all"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-bold leading-tight text-foreground mt-0.5">Job Summary</span>
            </button>
            <button
              onClick={() => {
                if (notebookLmLink) {
                  window.open(notebookLmLink, '_blank');
                } else {
                  setShowNotebookLmEdit(true);
                  setNotebookLmInput('');
                }
              }}
              onContextMenu={(e) => { e.preventDefault(); setShowNotebookLmEdit(true); setNotebookLmInput(notebookLmLink); }}
              className="rounded-xl bg-muted flex flex-col items-center justify-center gap-1 p-2 text-center active:scale-[0.97] transition-all relative"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10 text-orange-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-bold leading-tight text-foreground mt-0.5">NotebookLM</span>
              {!notebookLmLink && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 flex items-center justify-center">
                  <Plus className="w-2 h-2 text-white" />
                </div>
              )}
            </button>
          </div>

          {/* NotebookLM Link Edit Modal */}
          {showNotebookLmEdit && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNotebookLmEdit(false)}>
              <div className="bg-background rounded-xl p-5 w-full max-w-sm shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">NotebookLM Link</h3>
                  <button onClick={() => setShowNotebookLmEdit(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <input
                  type="url"
                  placeholder="Paste NotebookLM link here…"
                  value={notebookLmInput}
                  onChange={(e) => setNotebookLmInput(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground"
                />
                <div className="flex gap-2">
                  {notebookLmLink && (
                    <button
                      onClick={async () => {
                        const cId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
                        if (cId) {
                          await supabase.from('clients').update({ notebook_lm_link: null } as any).eq('id', cId);
                          setNotebookLmLink('');
                          setShowNotebookLmEdit(false);
                          toast({ title: 'Link removed' });
                        }
                      }}
                      className="flex-1 h-10 rounded-lg border border-destructive text-destructive text-sm font-bold"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!notebookLmInput.trim()) return;
                      const cId = site.id.startsWith('db-') ? site.id.replace('db-', '') : null;
                      if (cId) {
                        await supabase.from('clients').update({ notebook_lm_link: notebookLmInput.trim() } as any).eq('id', cId);
                        setNotebookLmLink(notebookLmInput.trim());
                        setShowNotebookLmEdit(false);
                        toast({ title: 'Link saved' });
                      }
                    }}
                    className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-2 border-b border-border space-y-2">
            {/* Hidden: Initial Site Inspection V1 & V2 - kept for admin re-enable */}
            {/* 
            <button onClick={() => setShowAssessment({ type: 'Initial Site Baseline', existingId: initialAssessment?.id })} className="...">
              Initial Site Inspection
            </button>
            <button onClick={() => setShowSiteInspectionV2(true)} className="...">
              Initial Site Inspection V2
            </button>
            */}

            {/* Annual Site Review - only if initial completed */}
            {initialAssessment?.status === 'completed' && (
              <button
                onClick={() => setShowAssessment({ type: '12-Month Review' })}
                className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Annual Site Review
              </button>
            )}

            <button
              onClick={() => setShowAddAsset(!showAddAsset)}
              className="w-full h-9 bg-primary text-primary-foreground rounded-lg font-medium text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Asset
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="p-8 text-center text-muted-foreground">Loading assets...</div>
            )}

            {!loading && hasDbAssets && Object.entries(groupedAssets).map(([className, assets]) => (
              <div key={className}>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    {className} ({assets.length})
                  </p>
                </div>
                {assets.map(asset => {
                  const crane = assetToCrane(asset);
                  const existing = getInspectionStatus(crane.id);
                  const existingDbDraft = clientReports.find(r => r.asset_id === asset.id && r.status === 'Draft');
                  const isCompleted = existing?.status === 'completed';
                  const isInProgress = existing?.status === 'in_progress' || !!existingDbDraft;

                  const handleContinueOrStart = () => {
                    if (existingDbDraft) {
                      // Open the existing draft directly
                      const rawId = asset.id;
                      setEditingReportId(existingDbDraft.id);
                      setActiveDbForm({ formId: existingDbDraft.form_id, crane, assetId: rawId });
                      return;
                    }
                    handleStartInspection(crane);
                  };

                  return (
                    <div key={asset.id} className="border-b border-border">
                      <div className="px-4 py-4">
                        <div onClick={() => setEditingAsset(asset)} role="button" tabIndex={0} className="flex items-start gap-3 cursor-pointer active:bg-muted/50 rounded-lg -mx-1 px-1 py-1 transition-colors">
                          {asset.main_photo_url ? (
                            <img src={asset.main_photo_url} alt={crane.name} className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-base">{crane.name}</p>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {asset.asset_type || asset.class_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[asset.capacity, crane.manufacturer, asset.serial_number ? `SN: ${asset.serial_number}` : null]
                                .filter(Boolean).join(' • ') || 'No details'}
                            </p>
                            {asset.location_name && (
                              <p className="text-xs text-muted-foreground">📍 {asset.location_name}{asset.area_name ? ` — ${asset.area_name}` : ''}</p>
                            )}
                          </div>
                          {existing?.status === 'completed' && (
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              existing.craneStatus === 'Crane is Operational' ? 'bg-rka-green-light text-rka-green-dark' :
                              existing.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                              'bg-rka-orange-light text-rka-orange'
                            }`}>
                              {existing.craneStatus}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={handleContinueOrStart}
                          className={`mt-3 w-full tap-target rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                            isCompleted
                              ? 'bg-muted text-foreground'
                              : isInProgress
                              ? 'bg-rka-orange text-destructive-foreground'
                              : 'bg-primary text-primary-foreground shadow-lg'
                          }`}
                        >
                          <PlayCircle className="w-5 h-5" />
                          {isCompleted ? 'View / Re-open' : isInProgress ? 'Continue form' : 'Start Inspection'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Fallback to mock cranes if no DB assets */}
            {!loading && !hasDbAssets && mockCranes.map(crane => {
              const existing = getInspectionStatus(crane.id);
              const existingDbDraft = clientReports.find(r => r.asset_name === crane.name && r.status === 'Draft');
              const isCompleted = existing?.status === 'completed';
              const isInProgress = existing?.status === 'in_progress' || !!existingDbDraft;

              return (
                <div key={crane.id} className="border-b border-border">
                  <div className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base">{crane.name}</p>
                        <p className="text-sm text-muted-foreground">{crane.type}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {crane.capacity} • {crane.manufacturer} • SN: {crane.serialNumber}
                        </p>
                      </div>
                      {existing?.status === 'completed' && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          existing.craneStatus === 'Crane is Operational' ? 'bg-rka-green-light text-rka-green-dark' :
                          existing.craneStatus === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                          'bg-rka-orange-light text-rka-orange'
                        }`}>
                          {existing.craneStatus}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartInspection(crane)}
                      className={`mt-3 w-full tap-target rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                        isCompleted
                          ? 'bg-muted text-foreground'
                          : isInProgress
                          ? 'bg-rka-orange text-destructive-foreground'
                          : 'bg-primary text-primary-foreground shadow-lg'
                      }`}
                    >
                      <PlayCircle className="w-5 h-5" />
                      {isCompleted ? 'View / Re-open' : isInProgress ? 'Continue form' : 'Start Inspection'}
                    </button>
                  </div>
                </div>
              );
            })}

            {!loading && !hasDbAssets && mockCranes.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <p className="font-medium">No assets found for this site</p>
                <p className="text-sm mt-1">Import assets via the admin tools</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Quotes */}
      {activeTab === 'quotes' && (
        <div className="flex-1 overflow-auto">
          {clientQuotes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No quotes found</p>
            </div>
          ) : (
            clientQuotes.map(q => (
              <div key={q.id} className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm">{q.quote_number || 'Draft Quote'}</p>
                    <p className="text-xs text-muted-foreground">{q.asset_name || 'General'} • {new Date(q.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">${Number(q.total || 0).toLocaleString()}</p>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      q.status === 'accepted' ? 'bg-rka-green-light text-rka-green-dark' :
                      q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    }`}>{q.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="flex-1 overflow-auto">
          {clientReports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileBarChart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No inspection reports found</p>
            </div>
          ) : (
            <>
              {/* Select all toggle */}
              <button
                onClick={() => {
                  if (selectedReportIds.size === clientReports.length) {
                    setSelectedReportIds(new Set());
                  } else {
                    setSelectedReportIds(new Set(clientReports.map(r => r.id)));
                  }
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedReportIds.size === clientReports.length}
                  readOnly
                  className="h-4 w-4 rounded border-primary accent-primary"
                />
                <span>{selectedReportIds.size === clientReports.length ? 'Deselect all' : 'Select all'}</span>
              </button>

              {clientReports.map(r => (
                <div key={r.id} className={`px-4 py-3 border-b border-border transition-colors ${selectedReportIds.has(r.id) ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedReportIds.has(r.id)}
                      onChange={() => {
                        setSelectedReportIds(prev => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-primary accent-primary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm">{r.asset_name || 'Site Inspection'}</p>
                          <p className="text-xs text-muted-foreground">{r.technician_name} • {new Date(r.inspection_date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.crane_status && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              r.crane_status === 'Crane is Operational' ? 'bg-rka-green-light text-rka-green-dark' :
                              r.crane_status === 'Unsafe to Operate' ? 'bg-rka-red-light text-rka-red' :
                              'bg-rka-orange-light text-rka-orange'
                            }`}>{r.crane_status}</span>
                          )}
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            r.status === 'Completed' ? 'bg-rka-green-light text-rka-green-dark' : 'bg-muted text-muted-foreground'
                          }`}>{r.status}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const crane: Crane = {
                              id: `report-${r.id}`,
                              siteId: site.id,
                              name: r.asset_name || 'Site Inspection',
                              type: 'Single Girder Overhead',
                              serialNumber: 'N/A',
                              capacity: 'N/A',
                              manufacturer: 'N/A',
                              yearInstalled: 0,
                            };
                            setActiveDbForm({ formId: r.form_id, crane, assetId: r.asset_id || undefined });
                            setEditingReportId(r.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingReportId(r.id)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Action buttons */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => {
                    if (selectedReportIds.size === 0) { toast({ title: 'Select at least one report', variant: 'destructive' }); return; }
                    dispatch({
                      type: 'SELECT_CRANE',
                      payload: {
                        crane: { id: '__site_summary__' } as any,
                        selectedReportIds: Array.from(selectedReportIds)
                      }
                    });
                    toast({ title: `Job Site Summary started with ${selectedReportIds.size} report(s)` });
                  }}
                  disabled={selectedReportIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Complete Job Site Summary with these reports
                </button>
                <button
                  onClick={async () => {
                    if (selectedReportIds.size === 0) { toast({ title: 'Select at least one report', variant: 'destructive' }); return; }
                    setDownloadingReports(true);
                    toast({ title: `Generating ${selectedReportIds.size} PDF(s)…` });
                    const selected = clientReports.filter(r => selectedReportIds.has(r.id));
                    const zip = new JSZip();
                    for (const report of selected) {
                      try {
                        // Fetch form template questions
                        const { data: ftqs } = await supabase
                          .from('form_template_questions')
                          .select('question_id, section_override, override_sort_order, sub_heading')
                          .eq('form_id', report.form_id)
                          .order('override_sort_order', { ascending: true });

                        const questionIds = (ftqs || []).map(q => q.question_id);
                        
                        // Fetch questions
                        const { data: questions } = await supabase
                          .from('question_library')
                          .select('*')
                          .in('question_id', questionIds);

                        // Fetch responses
                        const { data: responses } = await supabase
                          .from('inspection_responses')
                          .select('*')
                          .eq('inspection_id', report.id);

                        const responseMap: Record<string, any> = {};
                        (responses || []).forEach(r => { responseMap[r.question_id] = r; });

                        // Build sections
                        const sectionMap = new Map<string, any[]>();
                        for (const ftq of (ftqs || [])) {
                          const q = (questions || []).find(ql => ql.question_id === ftq.question_id);
                          if (!q) continue;
                          const sectionName = ftq.section_override || q.section || 'General';
                          if (!sectionMap.has(sectionName)) sectionMap.set(sectionName, []);
                          const resp = responseMap[q.question_id] || {};
                          sectionMap.get(sectionName)!.push({
                            question_text: q.question_text,
                            section: sectionName,
                            answer_value: resp.answer_value || null,
                            pass_fail_status: resp.pass_fail_status || null,
                            severity: resp.severity || null,
                            comment: resp.comment || null,
                            defect_flag: resp.defect_flag || false,
                            photo_urls: resp.photo_urls || [],
                            standard_ref: q.standard_ref || null,
                            urgency: resp.urgency || null,
                            defect_types: resp.defect_types || [],
                            internal_note: resp.internal_note || null,
                          });
                        }

                        const pdfSections = Array.from(sectionMap.entries()).map(([name, qs]) => ({ name, questions: qs }));

                        // Fetch form name
                        const { data: formData } = await supabase.from('form_templates').select('form_name').eq('form_id', report.form_id).single();

                        // Fetch asset photo
                        let assetPhotoUrl: string | undefined;
                        if (report.asset_id) {
                          const { data: asset } = await supabase.from('assets').select('main_photo_url').eq('id', report.asset_id).single();
                          if (asset?.main_photo_url) assetPhotoUrl = asset.main_photo_url;
                        }

                        const pdf = await generateInspectionPdf({
                          formName: formData?.form_name || 'Inspection',
                          assetName: report.asset_name || 'Site Inspection',
                          siteName: report.site_name || site?.name,
                          technicianName: report.technician_name,
                          inspectionDate: report.inspection_date,
                          craneStatus: report.crane_status || undefined,
                          sections: pdfSections,
                          aiSummary: report.ai_summary || undefined,
                          otherNotes: report.other_notes || undefined,
                          assetPhotoUrl,
                        });

                        const fileName = `${(report.asset_name || 'Inspection').replace(/[^a-zA-Z0-9]/g, '_')}_${report.inspection_date}.pdf`;
                        zip.file(fileName, pdf.output('arraybuffer'));
                      } catch (err) {
                        console.error('Failed to generate report', report.id, err);
                        toast({ title: `Failed: ${report.asset_name || 'report'}`, variant: 'destructive' });
                      }
                    }

                    try {
                      const blob = await zip.generateAsync({ type: 'blob' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${(site?.name || 'Reports').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: `${selected.length} report(s) downloaded as ZIP` });
                    } catch (err) {
                      console.error('ZIP generation failed', err);
                      toast({ title: 'Failed to create ZIP file', variant: 'destructive' });
                    }
                    setDownloadingReports(false);
                  }}
                  disabled={selectedReportIds.size === 0 || downloadingReports}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-foreground font-bold text-sm disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  Download Selected
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Jobs */}
      {activeTab === 'jobs' && (
        <div className="flex-1 overflow-auto">
          {clientJobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No jobs found</p>
            </div>
          ) : (
            clientJobs.map(j => (
              <div key={j.id} className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{j.job_type || 'General'} • {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString() : 'No date'}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
                    j.status === 'completed' ? 'bg-rka-green-light text-rka-green-dark' :
                    j.status === 'in_progress' ? 'bg-rka-orange-light text-rka-orange' :
                    'bg-muted text-muted-foreground'
                  }`}>{j.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddAsset && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="font-bold text-base">New Asset</p>
            <button onClick={() => setShowAddAsset(false)} className="text-sm font-medium text-muted-foreground">Cancel</button>
          </div>
          <div className="flex-1 overflow-auto">
            <AddAssetForm
              siteId={site.id}
              siteName={site.name}
              clientId={site.id.startsWith('db-') ? site.id.replace('db-', '') : null}
              onSaved={() => {
                setShowAddAsset(false);
                refreshAssets();
              }}
              onCancel={() => setShowAddAsset(false)}
            />
          </div>
        </div>
      )}

      <NoteToAdminModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} />

      {/* Delete Report Confirmation */}
      {deletingReportId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeletingReportId(null)}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Delete Report?</h3>
            <p className="text-sm text-muted-foreground">This will permanently delete the inspection report and all its responses. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingReportId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReport(deletingReportId)}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm"
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAsset && (
        <AssetDetailModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSaved={() => {
            setEditingAsset(null);
            refreshAssets();
          }}
        />
      )}

      {/* Template Picker Modal */}
      {templatePickerCrane && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setTemplatePickerCrane(null)}>
          <div
            className="bg-background w-full max-w-lg rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-base">Select Inspection Form</p>
                <p className="text-xs text-muted-foreground mt-0.5">{templatePickerCrane.name}</p>
                {activeJobId && activeJobName && (
                  <p className="text-[10px] text-primary font-medium mt-0.5">🔗 Linked to: {activeJobName}</p>
                )}
              </div>
              <button onClick={() => setTemplatePickerCrane(null)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Warn if no job linked */}
            {!activeJobId && (
              <div className="px-4 pt-3">
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700">No job linked — forms won't appear in a Job Site Summary. <button onClick={() => { setTemplatePickerCrane(null); setShowJobPrompt(true); }} className="underline font-bold">Link a job first</button></p>
                </div>
              </div>
            )}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
              {dbFormTemplates.map(ft => (
                <button
                  key={ft.form_id}
                  onClick={() => {
                    const rawId = templatePickerCrane.id.startsWith('asset-') ? templatePickerCrane.id.replace('asset-', '') : undefined;
                    setActiveDbForm({ formId: ft.form_id, crane: templatePickerCrane, assetId: rawId });
                    setTemplatePickerCrane(null);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all flex items-start gap-3"
                >
                  <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{ft.form_name}</p>
                    {ft.description && <p className="text-xs text-muted-foreground mt-0.5">{ft.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Job Link Prompt Modal */}
      {showJobPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowJobPrompt(false)}>
          <div
            className="bg-background w-full max-w-lg rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-base">Link to a Scheduled Job</p>
                <p className="text-xs text-muted-foreground mt-0.5">Select a job to scope all forms to this visit</p>
              </div>
              <button onClick={() => setShowJobPrompt(false)} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
              {clientJobs.filter(j => j.status !== 'completed').length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No open jobs for this client</p>
                  <p className="text-xs mt-1">Create a job from the Jobs tab first</p>
                </div>
              ) : (
                clientJobs.filter(j => j.status !== 'completed').map(j => (
                  <button
                    key={j.id}
                    onClick={() => {
                      if (onSetActiveJob) onSetActiveJob(j.id);
                      setActiveJobName(j.title);
                      setShowJobPrompt(false);
                      if (pendingFormAction) {
                        pendingFormAction();
                        setPendingFormAction(null);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 ${
                      activeJobId === j.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <Briefcase className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{j.job_type || 'General'} • {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString() : 'No date'}</p>
                    </div>
                    {activeJobId === j.id && <span className="text-xs font-bold text-primary">Active</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
