import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Site, Crane, Inspection, InspectionItemResult,
  InspectionTemplate, CraneOperationalStatus, SiteJobSummary, AdminNote,
  SentReport,
} from '@/types/inspection';
import { AdminFormConfig, DEFAULT_ADMIN_CONFIG } from '@/types/adminConfig';
import { mockSites, mockTemplate, mockTemplateLiftingEquipment, mockTemplateServiceBreakdown, mockTemplateCommissioningLoadTest } from '@/data/mockData';


interface AppState {
  currentUser: User | null;
  sites: Site[];
  selectedSite: Site | null;
  selectedCrane: Crane | null;
  templates: InspectionTemplate[];
  inspections: Inspection[];
  currentInspection: Inspection | null;
  siteJobSummaries: SiteJobSummary[];
  adminNotes: AdminNote[];
  sentReports: SentReport[];
  adminConfig: AdminFormConfig;
  selectedReportIdsForSummary: string[];
}

type Action =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SELECT_SITE'; payload: Site }
  | { type: 'SELECT_CRANE'; payload: { crane: Crane; selectedReportIds?: string[] } }
  | { type: 'START_INSPECTION'; payload: Inspection }
  | { type: 'UPDATE_INSPECTION_ITEM'; payload: { itemId: string; result: InspectionItemResult } }
  | { type: 'SET_CRANE_STATUS'; payload: { status: CraneOperationalStatus; overridden?: boolean } }
  | { type: 'SAVE_INSPECTION' }
  | { type: 'COMPLETE_INSPECTION' }
  | { type: 'REOPEN_INSPECTION' }
  | { type: 'SAVE_SITE_JOB_SUMMARY'; payload: SiteJobSummary }
  | { type: 'ADD_ADMIN_NOTE'; payload: AdminNote }
  | { type: 'BACK_TO_SITES' }
  | { type: 'BACK_TO_CRANES' }
  | { type: 'UPDATE_DEFECT_QUOTE'; payload: { itemId: string; quoteStatus: 'Quote Now' | 'Quote Later'; inspectionId?: string } }
  | { type: 'UPDATE_DEFECT_DETAIL'; payload: { itemId: string; updates: Partial<Pick<import('@/types/inspection').DefectDetail, 'customerComment' | 'quoteInstructions'>>; inspectionId?: string } }
  | { type: 'UPDATE_INSPECTION_META'; payload: Partial<Pick<Inspection, 'suggestedQuestions' | 'nextInspectionDate'>> }
  | { type: 'UPDATE_SUGGESTION_STATUS'; payload: { inspectionId: string; suggestionId: string; status: 'approved' | 'rejected' } }
  | { type: 'ADD_SENT_REPORT'; payload: SentReport }
  | { type: 'ADD_TEMPLATE_ITEM'; payload: { templateId: string; sectionId: string; item: import('@/types/inspection').TemplateItem } }
  | { type: 'REMOVE_TEMPLATE_ITEM'; payload: { templateId: string; sectionId: string; itemId: string } }
  | { type: 'UPDATE_TEMPLATE_ITEM'; payload: { templateId: string; sectionId: string; item: import('@/types/inspection').TemplateItem } }
  | { type: 'UPDATE_ADMIN_CONFIG'; payload: Partial<AdminFormConfig> }
  | { type: 'ELEVATE_TO_ADMIN' }
  | { type: 'EXIT_ADMIN' }
  | { type: 'SET_REPORT_IDS'; payload: string[] };

function loadSavedAdminConfig(): AdminFormConfig {
  try {
    const saved = localStorage.getItem('rka_admin_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_ADMIN_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_ADMIN_CONFIG;
}

const initialState: AppState = {
  currentUser: null,
  sites: mockSites,
  selectedSite: null,
  selectedCrane: null,
  templates: [mockTemplate, mockTemplateLiftingEquipment, mockTemplateServiceBreakdown, mockTemplateCommissioningLoadTest],
  inspections: [],
  currentInspection: null,
  siteJobSummaries: [],
  adminNotes: [],
  sentReports: [],
  adminConfig: loadSavedAdminConfig(),
  selectedReportIdsForSummary: [],
};

function computeCraneStatus(items: InspectionItemResult[]): CraneOperationalStatus | undefined {
  const defects = items.filter(i => (i.result === 'defect' || i.result === 'unresolved') && i.defect);
  if (defects.length === 0 && !items.some(i => i.result === 'unresolved')) return 'Crane is Operational';

  const hasCriticalImmediate = defects.some(
    d => d.defect?.severity === 'Critical' && d.defect?.rectificationTimeframe === 'Immediately'
  );
  if (hasCriticalImmediate) return 'Unsafe to Operate';
  if (items.some(i => i.result === 'unresolved')) return undefined;
  return undefined;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'ELEVATE_TO_ADMIN':
      if (!state.currentUser) return state;
      return { ...state, currentUser: { ...state.currentUser, role: 'admin' } };
    case 'EXIT_ADMIN':
      if (!state.currentUser) return state;
      return { ...state, currentUser: { ...state.currentUser, role: 'technician' } };
    case 'LOGOUT':
      supabase.auth.signOut().catch(() => {});
      return { ...initialState, sites: state.sites, templates: state.templates };
    case 'SELECT_SITE':
      return { ...state, selectedSite: action.payload, selectedCrane: null, currentInspection: null };
    case 'SELECT_CRANE':
      return {
        ...state,
        selectedCrane: action.payload.crane,
        selectedReportIdsForSummary: action.payload.selectedReportIds || []
      };
    case 'SET_REPORT_IDS':
      return { ...state, selectedReportIdsForSummary: action.payload };
    case 'START_INSPECTION':
      return { ...state, currentInspection: action.payload };
    case 'UPDATE_INSPECTION_ITEM': {
      if (!state.currentInspection) return state;
      const items = state.currentInspection.items.map(item =>
        item.templateItemId === action.payload.itemId ? action.payload.result : item
      );
      const autoStatus = computeCraneStatus(items);
      return {
        ...state,
        currentInspection: {
          ...state.currentInspection,
          items,
          craneStatus: state.currentInspection.craneStatusOverridden
            ? state.currentInspection.craneStatus
            : (autoStatus === 'Unsafe to Operate' ? autoStatus : state.currentInspection.craneStatus),
        },
      };
    }
    case 'SET_CRANE_STATUS':
      if (!state.currentInspection) return state;
      return {
        ...state,
        currentInspection: {
          ...state.currentInspection,
          craneStatus: action.payload.status,
          craneStatusOverridden: action.payload.overridden,
        },
      };
    case 'SAVE_INSPECTION':
      if (!state.currentInspection) return state;
      return {
        ...state,
        currentInspection: { ...state.currentInspection, status: 'in_progress' },
        inspections: [
          ...state.inspections.filter(i => i.id !== state.currentInspection!.id),
          { ...state.currentInspection, status: 'in_progress' },
        ],
      };
    case 'COMPLETE_INSPECTION': {
      if (!state.currentInspection) return state;
      const completed = {
        ...state.currentInspection,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        craneStatus: state.currentInspection.craneStatus || computeCraneStatus(state.currentInspection.items) || 'Crane is Operational',
      };
      return {
        ...state,
        currentInspection: completed,
        inspections: [
          ...state.inspections.filter(i => i.id !== completed.id),
          completed,
        ],
      };
    }
    case 'REOPEN_INSPECTION':
      if (!state.currentInspection) return state;
      return {
        ...state,
        currentInspection: {
          ...state.currentInspection,
          status: 'in_progress',
          lastEditedAt: new Date().toISOString(),
        },
      };
    case 'SAVE_SITE_JOB_SUMMARY':
      return {
        ...state,
        siteJobSummaries: [
          ...state.siteJobSummaries.filter(s => s.siteId !== action.payload.siteId),
          action.payload,
        ],
      };
    case 'ADD_ADMIN_NOTE':
      return { ...state, adminNotes: [...state.adminNotes, action.payload] };
    case 'BACK_TO_SITES':
      return { ...state, selectedSite: null, selectedCrane: null, currentInspection: null };
    case 'BACK_TO_CRANES':
      return { ...state, selectedCrane: null, currentInspection: null };
    case 'UPDATE_DEFECT_QUOTE': {
      const updateQuoteItems = (items: InspectionItemResult[]) =>
        items.map(item => {
          if (item.templateItemId === action.payload.itemId && item.defect) {
            return { ...item, defect: { ...item.defect, quoteStatus: action.payload.quoteStatus } };
          }
          return item;
        });

      const updatedInspections = state.inspections.map(insp => {
        if (action.payload.inspectionId && insp.id === action.payload.inspectionId) {
          return { ...insp, items: updateQuoteItems(insp.items) };
        }
        return insp;
      });

      const updatedCurrent = state.currentInspection
        ? { ...state.currentInspection, items: updateQuoteItems(state.currentInspection.items) }
        : state.currentInspection;

      return { ...state, inspections: updatedInspections, currentInspection: updatedCurrent };
    }
    case 'UPDATE_DEFECT_DETAIL': {
      const updateDetailItems = (items: InspectionItemResult[]) =>
        items.map(item => {
          if (item.templateItemId === action.payload.itemId && item.defect) {
            return { ...item, defect: { ...item.defect, ...action.payload.updates } };
          }
          return item;
        });
      const updatedInspections4 = state.inspections.map(insp => {
        if (action.payload.inspectionId && insp.id === action.payload.inspectionId) {
          return { ...insp, items: updateDetailItems(insp.items) };
        }
        return insp;
      });
      const updatedCurrent4 = state.currentInspection
        ? { ...state.currentInspection, items: updateDetailItems(state.currentInspection.items) }
        : state.currentInspection;
      return { ...state, inspections: updatedInspections4, currentInspection: updatedCurrent4 };
    }
    case 'UPDATE_INSPECTION_META':
      if (!state.currentInspection) return state;
      return {
        ...state,
        currentInspection: { ...state.currentInspection, ...action.payload },
      };
    case 'UPDATE_SUGGESTION_STATUS': {
      const updatedInspections = state.inspections.map(insp => {
        if (insp.id !== action.payload.inspectionId) return insp;
        return {
          ...insp,
          suggestedQuestions: (insp.suggestedQuestions || []).map(sq =>
            sq.id === action.payload.suggestionId ? { ...sq, status: action.payload.status } : sq
          ),
        };
      });
      return { ...state, inspections: updatedInspections };
    }
    case 'ADD_SENT_REPORT':
      return { ...state, sentReports: [action.payload, ...state.sentReports] };
    case 'ADD_TEMPLATE_ITEM': {
      const templates = state.templates.map(t => {
        if (t.id !== action.payload.templateId) return t;
        return {
          ...t,
          sections: t.sections.map(s => {
            if (s.id !== action.payload.sectionId) return s;
            return { ...s, items: [...s.items, action.payload.item] };
          }),
        };
      });
      return { ...state, templates };
    }
    case 'REMOVE_TEMPLATE_ITEM': {
      const templates2 = state.templates.map(t => {
        if (t.id !== action.payload.templateId) return t;
        return {
          ...t,
          sections: t.sections.map(s => {
            if (s.id !== action.payload.sectionId) return s;
            return { ...s, items: s.items.filter(i => i.id !== action.payload.itemId) };
          }),
        };
      });
      return { ...state, templates: templates2 };
    }
    case 'UPDATE_TEMPLATE_ITEM': {
      const templates3 = state.templates.map(t => {
        if (t.id !== action.payload.templateId) return t;
        return {
          ...t,
          sections: t.sections.map(s => {
            if (s.id !== action.payload.sectionId) return s;
            return {
              ...s,
              items: s.items.map(i => i.id === action.payload.item.id ? action.payload.item : i),
            };
          }),
        };
      });
      return { ...state, templates: templates3 };
    }
    case 'UPDATE_ADMIN_CONFIG': {
      const newConfig = { ...state.adminConfig, ...action.payload };
      try { localStorage.setItem('rka_admin_config', JSON.stringify(newConfig)); } catch { }
      supabase.from('admin_config').upsert({ id: 'default', config: newConfig as any, updated_at: new Date().toISOString() }).then();
      return { ...state, adminConfig: newConfig };
    }
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  authLoading: boolean;
}>({ state: initialState, dispatch: () => { }, authLoading: true });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen for Supabase auth state changes
  useEffect(() => {
    let mounted = true;
    let authCheckTimeout: ReturnType<typeof setTimeout>;

    const processSession = async (session: any, source: string) => {
      if (!mounted) return;
      console.log(`AppContext: Processing session from ${source}`, session?.user?.id);
      
      if (session?.user) {
        const email = session.user.email || '';
        const meta = session.user.user_metadata || {};
        const displayName = meta.display_name || meta.full_name || email.split('@')[0];
        
        let role: 'technician' | 'admin' = 'technician';
        try {
          // Fetch role with a timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const { data: roleData, error: roleError } = await (supabase as any)
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          clearTimeout(timeoutId);
          
          if (roleError) console.error("AppContext: Error fetching role:", roleError);
          if (roleData) {
            console.log("AppContext: User is admin");
            role = 'admin';
          }
        } catch (err) {
          console.error("AppContext: Exception fetching role:", err);
        }

        if (mounted) {
          dispatch({
            type: 'LOGIN',
            payload: { id: session.user.id, name: displayName, email, role },
          });
        }
      } else {
        if (mounted) dispatch({ type: 'LOGOUT' });
      }

      if (mounted) {
        console.log(`AppContext: Setting authLoading to false (from ${source})`);
        setAuthLoading(false);
        if (authCheckTimeout) clearTimeout(authCheckTimeout);
      }
    };

    // 1. Initialize auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AppContext: auth state change event:", event, "session:", !!session);
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
        setAuthLoading(false);
      } else if (session) {
        processSession(session, `onAuthStateChange(${event})`);
      } else {
        setAuthLoading(false);
      }
    });

    // 2. Immediate check for existing session as well
    // This handles the case where onAuthStateChange might fire late or not at all on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("AppContext: Error getting session:", error);
      if (session) {
        processSession(session, 'getSession');
      } else {
        console.log("AppContext: No session from getSession, setting authLoading to false");
        setAuthLoading(false);
      }
    }).catch(err => {
      console.error("AppContext: getSession exception:", err);
      setAuthLoading(false);
    });

    // 3. Failsafe timeout: If we're still loading after 10 seconds, something is wrong
    authCheckTimeout = setTimeout(() => {
      if (mounted && authLoading) {
        console.warn("AppContext: Auth check timed out. Forcing authLoading to false.");
        setAuthLoading(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (authCheckTimeout) clearTimeout(authCheckTimeout);
    };
  }, []);

  // Load admin config from database on mount
  useEffect(() => {
    if (!state.currentUser) return;
    supabase.from('admin_config').select('config').eq('id', 'default').maybeSingle().then(({ data }) => {
      if (data?.config && typeof data.config === 'object') {
        const dbConfig = { ...DEFAULT_ADMIN_CONFIG, ...(data.config as any) };
        dispatch({ type: 'UPDATE_ADMIN_CONFIG', payload: dbConfig });
      }
    });
  }, [state.currentUser?.id]);

  return (
    <AppContext.Provider value={{ state, dispatch, authLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
