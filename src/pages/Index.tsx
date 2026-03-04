import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import Login from './Login';
import Sites from './Sites';
import CraneList from './CraneList';
import InspectionForm from './InspectionForm';
import DefectSummary from './DefectSummary';
import SiteJobSummary from './SiteJobSummary';
import AdminDashboard from './AdminDashboard';
import TechDashboard, { DashboardView } from './TechDashboard';
import SchedulePage from './SchedulePage';
import TechReports from './TechReports';
import TimesheetPage from './TimesheetPage';
import QuoteBuilder from './QuoteBuilder';
import QuotesPage from './QuotesPage';
import ToDoPage from './ToDoPage';
import ReceiptsPage from './ReceiptsPage';
import TasksPage from './TasksPage';
import JobDetailPage from './JobDetailPage';


const Index = () => {
  const { state, dispatch } = useApp();
  const [dashboardView, setDashboardView] = useState<DashboardView>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [clientInitialTab, setClientInitialTab] = useState<'details' | 'assets' | undefined>(undefined);
  const [quoteMode, setQuoteMode] = useState<{ active: boolean; defects?: any[]; fromQuotesPage?: boolean; draftQuote?: any; estimateNotes?: string }>({ active: false });

  if (!state.currentUser) return <Login />;
  if (state.currentUser.role === 'admin') return <AdminDashboard />;

  // Job detail view
  if (selectedJobId) {
    return <JobDetailPage jobId={selectedJobId} onBack={() => { setSelectedJobId(null); setDashboardView('tasks'); }} onStartInspection={(job) => {
      // Set active job context, find & select the client site, navigate to asset list
      setActiveJobId(job.id);
      if (job.client_name) {
        dispatch({ type: 'SELECT_SITE', payload: { id: `job-${job.id}`, name: job.client_name, address: '', contactName: '', contactPhone: '', cranes: [] } });
      }
      setSelectedJobId(null);
      setDashboardView('assets');
    }} />;
  }

  // Quote builder
  if (quoteMode.active && state.selectedSite) {
    return <QuoteBuilder onBack={() => {
      setQuoteMode({ active: false });
      if (quoteMode.fromQuotesPage) setDashboardView('quotes');
    }} prefilledDefects={quoteMode.defects} draftQuote={quoteMode.draftQuote} initialNotes={quoteMode.estimateNotes} />;
  }

  if (quoteMode.active && !state.selectedSite) {
    return <Sites onBack={() => setQuoteMode({ active: false })} />;
  }

  if (state.currentInspection) {
    if (state.currentInspection.status === 'completed') return <DefectSummary />;
    return <InspectionForm />;
  }

  if (state.selectedCrane?.id === '__site_summary__') {
    return <SiteJobSummary onCreateQuote={(defects) => setQuoteMode({ active: true, defects })} activeJobId={activeJobId} />;
  }

  if (state.selectedSite && (dashboardView === 'clients' || dashboardView === 'assets')) {
    return <CraneList activeJobId={activeJobId} onSetActiveJob={setActiveJobId} initialTab={clientInitialTab} />;
  }

  if (dashboardView === 'schedule') return <SchedulePage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'clients' || dashboardView === 'assets') return <Sites onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'reports') return <TechReports onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'timesheet') return <TimesheetPage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'quotes') return <QuotesPage onBack={() => setDashboardView(null)} onCreateQuote={() => setQuoteMode({ active: true, fromQuotesPage: true })} onEditQuote={(quote) => {
    if (quote.site_name) {
      dispatch({ type: 'SELECT_SITE', payload: { id: quote.id, name: quote.site_name, address: '', contactName: '', contactPhone: '', cranes: [] } });
    }
    setQuoteMode({ active: true, fromQuotesPage: true, draftQuote: { id: quote.id, client_name: quote.client_name, site_name: quote.site_name, items: quote.items || [], subtotal: quote.subtotal, gst: quote.gst, total: quote.total, quote_number: quote.quote_number } });
  }} onPushEstimateToDraft={(description, clientName) => {
    const siteName = clientName || 'New Quote';
    dispatch({ type: 'SELECT_SITE', payload: { id: `estimate-${Date.now()}`, name: siteName, address: '', contactName: '', contactPhone: '', cranes: [] } });
    setQuoteMode({ active: true, fromQuotesPage: true, estimateNotes: description });
  }} />;
  if (dashboardView === 'receipts') return <ReceiptsPage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'todo') return <ToDoPage onBack={() => setDashboardView(null)} onGoToQuotes={() => setDashboardView('quotes')} />;
  if (dashboardView === 'tasks') return <TasksPage onBack={() => setDashboardView(null)} onOpenJob={(id) => {
    setSelectedJobId(id);
    setActiveJobId(id);
  }} onOpenClient={async (clientName) => {
    // Look up the client by name and navigate to their details
    const { data } = await supabase.from('clients').select('id, client_name, location_address, primary_contact_name, primary_contact_mobile').eq('client_name', clientName).maybeSingle();
    if (data) {
      dispatch({ type: 'SELECT_SITE', payload: { id: `db-${data.id}`, name: data.client_name, address: data.location_address || '', contactName: data.primary_contact_name || '', contactPhone: data.primary_contact_mobile || '', cranes: [] } });
      setClientInitialTab('details');
      setDashboardView('clients');
    }
  }} />;
  

  return <TechDashboard onNavigate={setDashboardView} />;
};

export default Index;
