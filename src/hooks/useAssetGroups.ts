import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssetGroup {
  name: string;
  types: string[];
}

export function useAssetGroups() {
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_config')
      .select('config')
      .eq('id', 'asset_groups')
      .maybeSingle();
    if (data?.config) {
      const c = data.config as any;
      if (c.groups?.length) setGroups(c.groups);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return { groups, loading, reload: load };
}
