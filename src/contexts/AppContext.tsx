import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  User, Site, Crane, Inspection, InspectionItemResult,
  InspectionTemplate, CraneOperationalStatus, SiteJobSummary, AdminNote,
  DefectSeverity, RectificationTimeframe,
} from '@/types/inspection';
import { mockSites, mockTemplate, mockUsers } from '@/data/mockData';
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
  | { type: 'UPDATE_DEFECT_QUOTE'; payload: { itemId: string; quoteStatus: 'Quote Now' | 'Quote Later' } };

const initialState: AppState = {
  currentUser: null,
  sites: mockSites,
  selectedSite: null,
  selectedCrane: null,
  templates: [mockTemplate],
  inspections: [],
  currentInspection: null,
  siteJobSummaries: [],
  adminNotes: [],
};

function computeCraneStatus(items: InspectionItemResult[]): CraneOperationalStatus | undefined {
  const defects = items.filter(i => i.result === 'defect' && i.defect);
  if (defects.length === 0) return 'Safe to Operate';

  const hasCriticalImmediate = defects.some(
    d => d.defect?.severity === 'Critical' && d.defect?.rectificationTimeframe === 'Immediately'
  );
  if (hasCriticalImmediate) return 'Unsafe to Operate';
  return undefined; // technician must choose
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
      if (!state.currentInspection) return state;
      const items = state.currentInspection.items.map(item => {
        if (item.templateItemId === action.payload.itemId && item.defect) {
          return { ...item, defect: { ...item.defect, quoteStatus: action.payload.quoteStatus } };
        }
        return item;
      });
      return { ...state, currentInspection: { ...state.currentInspection, items } };
    }
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
