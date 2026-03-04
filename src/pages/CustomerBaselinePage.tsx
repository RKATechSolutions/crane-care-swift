import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CraneBaselineForm from './CraneBaselineForm';

export default function CustomerBaselinePage() {
  const [searchParams] = useSearchParams();
  const baselineId = searchParams.get('id');
  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!baselineId) {
      setError('Invalid link — no baseline ID provided.');
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('crane_baselines')
        .select('site_name, company_name')
        .eq('id', baselineId)
        .single();
      if (data) {
        setSiteName(data.company_name || data.site_name);
      } else {
        setError('Baseline not found. Please contact RKA Crane Services.');
      }
      setLoading(false);
    };
    load();
  }, [baselineId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2">Link Error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <CraneBaselineForm
      existingId={baselineId!}
      mode="customer"
      customerSiteName={siteName}
      onBack={() => {
        // Customer can't go "back" — show thank you
        window.location.reload();
      }}
    />
  );
}
