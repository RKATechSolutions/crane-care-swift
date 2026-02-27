import { useApp } from '@/contexts/AppContext';
import Login from './Login';
import Sites from './Sites';
import CraneList from './CraneList';
import InspectionForm from './InspectionForm';
import DefectSummary from './DefectSummary';
import SiteJobSummary from './SiteJobSummary';
import AdminDashboard from './AdminDashboard';

const Index = () => {
  const { state } = useApp();

  // Not logged in
  if (!state.currentUser) return <Login />;

  // Admin goes to dashboard
  if (state.currentUser.role === 'admin') return <AdminDashboard />;

  // No site selected
  if (!state.selectedSite) return <Sites />;

  // Site Job Summary
  if (state.selectedCrane?.id === '__site_summary__') return <SiteJobSummary />;

  // Active inspection
  if (state.currentInspection) {
    if (state.currentInspection.status === 'completed') {
      return <DefectSummary />;
    }
    return <InspectionForm />;
  }

  // Crane list
  return <CraneList />;
};

export default Index;
