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

const Index = () => {
  const { state } = useApp();
  const [dashboardView, setDashboardView] = useState<DashboardView>(null);

  if (!state.currentUser) return <Login />;
  if (state.currentUser.role === 'admin') return <AdminDashboard />;

  // Active inspection takes priority
  if (state.currentInspection) {
    if (state.currentInspection.status === 'completed') return <DefectSummary />;
    return <InspectionForm />;
  }

  if (state.selectedCrane?.id === '__site_summary__') return <SiteJobSummary />;

  if (state.selectedSite && (dashboardView === 'clients' || dashboardView === 'assets')) {
    return <CraneList />;
  }

  if (dashboardView === 'schedule') return <SchedulePage onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'clients' || dashboardView === 'assets') return <Sites />;
  if (dashboardView === 'reports') return <TechReports onBack={() => setDashboardView(null)} />;
  if (dashboardView === 'timesheet') return <TimesheetPage onBack={() => setDashboardView(null)} />;

  return <TechDashboard onNavigate={setDashboardView} />;
};

export default Index;
