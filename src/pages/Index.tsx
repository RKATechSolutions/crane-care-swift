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

const Index = () => {
  const { state } = useApp();
  const [dashboardView, setDashboardView] = useState<DashboardView>(null);

  // Not logged in
  if (!state.currentUser) return <Login />;

  // Admin goes to dashboard
  if (state.currentUser.role === 'admin') return <AdminDashboard />;

  // === Technician Flow ===

  // Active inspection takes priority
  if (state.currentInspection) {
    if (state.currentInspection.status === 'completed') {
      return <DefectSummary />;
    }
    return <InspectionForm />;
  }

  // Site Job Summary
  if (state.selectedCrane?.id === '__site_summary__') return <SiteJobSummary />;

  // Crane list (when site is selected from Clients)
  if (state.selectedSite && (dashboardView === 'clients' || dashboardView === 'assets')) {
    return <CraneList />;
  }

  // Dashboard sub-views
  if (dashboardView === 'schedule') {
    return <SchedulePage onBack={() => setDashboardView(null)} />;
  }

  if (dashboardView === 'clients' || dashboardView === 'assets') {
    return <Sites />;
  }

  if (dashboardView === 'reports') {
    return <TechReports onBack={() => setDashboardView(null)} />;
  }

  // Main dashboard
  return <TechDashboard onNavigate={setDashboardView} />;
};

export default Index;
