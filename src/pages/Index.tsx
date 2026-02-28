import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
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

const Index = () => {
  const { state, dispatch } = useApp();
  const [dashboardView, setDashboardView] = useState<DashboardView>(null);
  const [quoteMode, setQuoteMode] = useState<{ active: boolean; defects?: any[]; fromQuotesPage?: boolean; draftQuote?: any; estimateNotes?: string }>({ active: false });

  if (!state.currentUser) return <Login />;
  if (state.currentUser.role === 'admin') return <AdminDashboard />;

  // Quote builder
  if (quoteMode.active && state.selectedSite) {
    return <QuoteBuilder onBack={() => {
      setQuoteMode({ active: false });
      if (quoteMode.fromQuotesPage) setDashboardView('quotes');
    }} prefilledDefects={quoteMode.defects} draftQuote={quoteMode.draftQuote} initialNotes={quoteMode.estimateNotes} />;
  }

  // If quoteMode is active but no site selected yet, show Sites for selection
  if (quoteMode.active && !state.selectedSite) {
    return <Sites />;
  }

  // Active inspection takes priority
  if (state.currentInspection) {
    if (state.currentInspection.status === 'completed') return <DefectSummary />;
    return <InspectionForm />;
  }

  if (state.selectedCrane?.id === '__site_summary__') {
    return <SiteJobSummary onCreateQuote={(defects) => setQuoteMode({ active: true, defects })} />;
  }

  if (state.selectedSite && (dashboardView === 'clients' || dashboardView === 'assets')) {
    return <CraneList />;
  }

  if (dashboardView === 'schedule') return <SchedulePage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'clients' || dashboardView === 'assets') return <Sites />;
  if (dashboardView === 'reports') return <TechReports onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'timesheet') return <TimesheetPage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'quotes') return <QuotesPage onBack={() => setDashboardView(null)} onCreateQuote={() => setQuoteMode({ active: true, fromQuotesPage: true })} onEditQuote={(quote) => {
    // Set site from quote so QuoteBuilder can load
    if (quote.site_name) {
      dispatch({ type: 'SELECT_SITE', payload: { id: quote.id, name: quote.site_name, address: '', contactName: '', contactPhone: '', cranes: [] } });
    }
    setQuoteMode({ active: true, fromQuotesPage: true, draftQuote: { id: quote.id, client_name: quote.client_name, site_name: quote.site_name, items: quote.items || [], subtotal: quote.subtotal, gst: quote.gst, total: quote.total, quote_number: quote.quote_number } });
  }} onPushEstimateToDraft={(description, clientName) => {
    // Create a site context from the estimate client name
    const siteName = clientName || 'New Quote';
    dispatch({ type: 'SELECT_SITE', payload: { id: `estimate-${Date.now()}`, name: siteName, address: '', contactName: '', contactPhone: '', cranes: [] } });
    setQuoteMode({ active: true, fromQuotesPage: true, estimateNotes: description });
  }} />;
  if (dashboardView === 'receipts') return <ReceiptsPage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'todo') return <ToDoPage onBack={() => setDashboardView(null)} onGoToQuotes={() => setDashboardView('quotes')} />;

  return <TechDashboard onNavigate={setDashboardView} />;
};

export default Index;
