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

const Index = () => {
  const { state } = useApp();
  const [dashboardView, setDashboardView] = useState<DashboardView>(null);
  const [quoteMode, setQuoteMode] = useState<{ active: boolean; defects?: any[] }>({ active: false });

  if (!state.currentUser) return <Login />;
  if (state.currentUser.role === 'admin') return <AdminDashboard />;

  // Quote builder
  if (quoteMode.active && state.selectedSite) {
    return <QuoteBuilder onBack={() => setQuoteMode({ active: false })} prefilledDefects={quoteMode.defects} />;
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
  if (dashboardView === 'quotes') return <QuotesPage onBack={() => setDashboardView(null)} onCreateQuote={() => setDashboardView('clients')} />;
  if (dashboardView === 'todo') return <ToDoPage onBack={() => setDashboardView(null)} onGoToQuotes={() => setDashboardView('quotes')} />;

  return <TechDashboard onNavigate={setDashboardView} />;
};

export default Index;
