import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { assets } = await req.json();

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      throw new Error("No assets provided");
    }

    // Get all clients for linking
    const { data: allClients } = await supabase
      .from("clients")
      .select("id, client_name");

    // Build multiple lookup maps for fuzzy client matching
    const exactMap = new Map<string, string>();
    const clientNames: Array<{lower: string, id: string}> = [];
    if (allClients) {
      for (const c of allClients) {
        exactMap.set(c.client_name.toLowerCase(), c.id);
        clientNames.push({ lower: c.client_name.toLowerCase(), id: c.id });
      }
    }

    function findClientId(accountName: string | null): string | null {
      if (!accountName) return null;
      const lower = accountName.toLowerCase().trim();
      // 1. Exact match
      if (exactMap.has(lower)) return exactMap.get(lower)!;
      // 2. Client name contains account name or vice versa
      for (const c of clientNames) {
        if (c.lower.includes(lower) || lower.includes(c.lower)) return c.id;
      }
      // 3. First word match (for cases like "Greens Foods" matching "Greens Foods Pty Ltd")
      const firstWord = lower.split(' ')[0];
      if (firstWord.length >= 4) {
        for (const c of clientNames) {
          if (c.lower.startsWith(firstWord)) return c.id;
        }
      }
      return null;
    }

    // Clear existing assets first
    await supabase.from("assets").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Map and insert in batches
    let inserted = 0;
    let linked = 0;
    const batchSize = 50;

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize).map((a: any) => {
        const accountName = a.accountName?.trim() || null;
        const clientId = findClientId(accountName);
        if (clientId) linked++;

        return {
          external_id: a.id?.toString() || null,
          class_name: a.className || "Unknown",
          asset_id1: a.id1 || null,
          asset_id2: a.id2 || null,
          status: a.status || "In Service",
          account_id: a.accountId?.toString() || null,
          account_name: accountName,
          account_num: a.accountNum || null,
          location_id: a.locationId?.toString() || null,
          location_name: a.locationName || null,
          location_num: a.locationNum || null,
          area_name: a.areaName || null,
          description: a.description || null,
          urgent_note: a.urgentNote || null,
          latitude: a.latitude ? parseFloat(a.latitude) : null,
          longitude: a.longitude ? parseFloat(a.longitude) : null,
          asset_created_at: a.createdAt || null,
          created_by_id: a.createdById?.toString() || null,
          asset_type: a.Type || a.type || null,
          capacity: a.Capacity || a.capacity || null,
          manufacturer: a.Manufacturer || a.manufacturer || null,
          model_number: a["Model Number"] || a.modelNumber || null,
          serial_number: a["Serial Number"] || a.serialNumber || null,
          length_lift: a["Length/Lift"] || a.Length || a.lengthLift || null,
          power: a.Power || null,
          pendant_remote: a["Pendant/Remote"] || null,
          crane_manufacturer: a["Crane Manufacturer"] || null,
          hoist_configuration: a["Hoist Configuration"] || null,
          trolley_configuration: a["Trolley Configuration"] || null,
          lifting_medium_hoist1: a["Lifting Medium, Hoist 1"] || null,
          manufacturer_hoist1: a["Manufacturer, Hoist 1"] || null,
          model_hoist1: a["Model Number, Hoist 1"] || null,
          serial_hoist1: a["Serial Number, Hoist 1"] || null,
          lifting_medium_hoist2: a["Lifting Medium, Hoist 2"] || null,
          manufacturer_hoist2: a["Manufacturer, Hoist 2"] || null,
          model_hoist2: a["Model Number, Hoist 2"] || null,
          serial_hoist2: a["Serial Number, Hoist 2"] || null,
          control_type: a["Control Type"] || null,
          pendant_brand: a["Pendant Brand"] || null,
          trolley_serial: a["Trolley Serial Number"] || null,
          configuration: a.Configuration || null,
          grade_size: a["Grade & Size"] || null,
          hook_type: a["Hook Type"] || null,
          client_id: clientId || null,
        };
      });

      const { error } = await supabase.from("assets").insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        throw error;
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, imported: inserted, linked }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
