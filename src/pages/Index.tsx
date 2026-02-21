import { useApp } from '@/contexts/AppContext';
import Login from './Login';
import Sites from './Sites';
import CraneList from './CraneList';
import InspectionForm from './InspectionForm';
import DefectSummary from './DefectSummary';
import SiteJobSummary from './SiteJobSummary';

const Index = () => {
  const { state } = useApp();

  // Not logged in
  if (!state.currentUser) return <Login />;

  // No site selected
  if (!state.selectedSite) return <Sites />;

  // Site Job Summary
  if (state.selectedCrane?.id === '__site_summary__') return <SiteJobSummary />;

  // Active inspection
  if (state.currentInspection) {
    // If completed, show defect summary
    if (state.currentInspection.status === 'completed') {
      const hasDefects = state.currentInspection.items.some(i => i.result === 'defect');
      if (hasDefects) return <DefectSummary />;
      return <DefectSummary />;
    }
    return <InspectionForm />;
  }

  // Crane list
  return <CraneList />;
};

export default Index;
