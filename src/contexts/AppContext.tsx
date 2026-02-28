import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  User, Site, Crane, Inspection, InspectionItemResult,
  InspectionTemplate, CraneOperationalStatus, SiteJobSummary, AdminNote,
  DefectSeverity, RectificationTimeframe, SuggestedQuestion, SentReport,
} from '@/types/inspection';
import { AdminFormConfig, DEFAULT_ADMIN_CONFIG } from '@/types/adminConfig';
import { mockSites, mockTemplate, mockTemplateLiftingEquipment, mockTemplateServiceBreakdown, mockUsers } from '@/data/mockData';
import { addDays, format } from 'date-fns';

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
}

type Action =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SELECT_SITE'; payload: Site }
  | { type: 'SELECT_CRANE'; payload: Crane }
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
  | { type: 'UPDATE_INSPECTION_META'; payload: Partial<Pick<Inspection, 'suggestedQuestions' | 'nextInspectionDate'>> }
  | { type: 'UPDATE_SUGGESTION_STATUS'; payload: { inspectionId: string; suggestionId: string; status: 'approved' | 'rejected' } }
  | { type: 'ADD_SENT_REPORT'; payload: SentReport }
  | { type: 'ADD_TEMPLATE_ITEM'; payload: { templateId: string; sectionId: string; item: import('@/types/inspection').TemplateItem } }
  | { type: 'REMOVE_TEMPLATE_ITEM'; payload: { templateId: string; sectionId: string; itemId: string } }
  | { type: 'UPDATE_TEMPLATE_ITEM'; payload: { templateId: string; sectionId: string; item: import('@/types/inspection').TemplateItem } }
  | { type: 'UPDATE_ADMIN_CONFIG'; payload: Partial<AdminFormConfig> };

const initialState: AppState = {
  currentUser: null,
  sites: mockSites,
  selectedSite: null,
  selectedCrane: null,
  templates: [mockTemplate, mockTemplateLiftingEquipment, mockTemplateServiceBreakdown],
  inspections: [],
  currentInspection: null,
  siteJobSummaries: [],
  adminNotes: [],
  sentReports: [],
  adminConfig: DEFAULT_ADMIN_CONFIG,
};

function computeCraneStatus(items: InspectionItemResult[]): CraneOperationalStatus | undefined {
  const defects = items.filter(i => (i.result === 'defect' || i.result === 'unresolved') && i.defect);
  if (defects.length === 0 && !items.some(i => i.result === 'unresolved')) return 'Safe to Operate';

  const hasCriticalImmediate = defects.some(
    d => d.defect?.severity === 'Critical' && d.defect?.rectificationTimeframe === 'Immediately'
  );
  if (hasCriticalImmediate) return 'Unsafe to Operate';
  if (items.some(i => i.result === 'unresolved')) return undefined; // technician must choose
  return undefined;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...initialState, sites: state.sites, templates: state.templates };
    case 'SELECT_SITE':
      return { ...state, selectedSite: action.payload, selectedCrane: null, currentInspection: null };
    case 'SELECT_CRANE':
      return { ...state, selectedCrane: action.payload };
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
        craneStatus: state.currentInspection.craneStatus || computeCraneStatus(state.currentInspection.items) || 'Safe to Operate',
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

      // Update in inspections list (for SiteJobSummary)
      const updatedInspections = state.inspections.map(insp => {
        if (action.payload.inspectionId && insp.id === action.payload.inspectionId) {
          return { ...insp, items: updateQuoteItems(insp.items) };
        }
        return insp;
      });

      // Also update currentInspection if active
      const updatedCurrent = state.currentInspection
        ? { ...state.currentInspection, items: updateQuoteItems(state.currentInspection.items) }
        : state.currentInspection;

      return { ...state, inspections: updatedInspections, currentInspection: updatedCurrent };
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
    case 'UPDATE_ADMIN_CONFIG':
      return { ...state, adminConfig: { ...state.adminConfig, ...action.payload } };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
