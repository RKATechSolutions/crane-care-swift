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

    // Get all clients for matching
    const { data: allClients } = await supabase
      .from("clients")
      .select("id, client_name");

    const clientMap = new Map<string, string>();
    if (allClients) {
      for (const c of allClients) {
        clientMap.set(c.client_name.toLowerCase().trim(), c.id);
      }
    }

    function findClientId(clientName: string | null): string | null {
      if (!clientName) return null;
      const lower = clientName.toLowerCase().trim();
      if (clientMap.has(lower)) return clientMap.get(lower)!;
      // Partial match
      for (const [name, id] of clientMap) {
        if (name.includes(lower) || lower.includes(name)) return id;
      }
      // First word match
      const firstWord = lower.split(' ')[0];
      if (firstWord.length >= 4) {
        for (const [name, id] of clientMap) {
          if (name.startsWith(firstWord)) return id;
        }
      }
      return null;
    }

    // Deduplicate assets by external_id (aroflo asset ID)
    const uniqueAssets = new Map<string, any>();
    for (const a of assets) {
      const key = a.externalId || `${a.clientName}-${a.assetId1}-${a.description}`;
      if (!uniqueAssets.has(key)) {
        uniqueAssets.set(key, a);
      }
    }

    console.log(`Received ${assets.length} rows, deduplicated to ${uniqueAssets.size} unique assets`);

    let inserted = 0;
    let linked = 0;
    let skipped = 0;
    const batchSize = 50;
    const assetArray = Array.from(uniqueAssets.values());

    for (let i = 0; i < assetArray.length; i += batchSize) {
      const batch = assetArray.slice(i, i + batchSize).map((a: any) => {
        const clientName = a.clientName?.trim() || null;
        const clientId = a.matchedClientId || findClientId(clientName);
        if (clientId) linked++;

        return {
          external_id: a.externalId?.toString() || null,
          class_name: a.className || "Unknown",
          asset_id1: a.assetId1 || null,
          asset_id2: a.assetId2 || null,
          status: a.status || "In Service",
          account_name: clientName,
          barcode: a.barcode || null,
          location_id: a.locationId?.toString() || null,
          location_name: a.locationName || null,
          location_num: a.locationNum || null,
          area_name: a.areaName || null,
          description: a.description || null,
          latitude: a.latitude ? parseFloat(a.latitude) : null,
          longitude: a.longitude ? parseFloat(a.longitude) : null,
          asset_created_at: a.createdAt || null,
          created_by_id: a.createdById?.toString() || null,
          asset_type: a.assetType || null,
          capacity: a.capacity || null,
          manufacturer: a.manufacturer || null,
          crane_manufacturer: a.manufacturer || null,
          model_number: a.modelNumber || null,
          serial_number: a.serialNumber || null,
          length_lift: a.lengthLift || null,
          power: a.power || null,
          power_supply: a.powerSupply || null,
          control_type: a.controlType || null,
          configuration: a.configuration || null,
          grade_size: a.gradeSize || null,
          hook_type: a.hookType || null,
          pendant_remote: a.pendantRemote || null,
          pendant_brand: a.pendantBrand || null,
          hoist_configuration: a.hoistConfig || null,
          trolley_configuration: a.trolleyConfig || null,
          lifting_medium_hoist1: a.liftMedHoist1 || null,
          manufacturer_hoist1: a.mfgHoist1 || null,
          model_hoist1: a.modelHoist1 || null,
          serial_hoist1: a.serialHoist1 || null,
          lifting_medium_hoist2: a.liftMedHoist2 || null,
          manufacturer_hoist2: a.mfgHoist2 || null,
          model_hoist2: a.modelHoist2 || null,
          serial_hoist2: a.serialHoist2 || null,
          trolley_serial: a.trolleySerial || null,
          client_id: clientId || null,
        };
      });

      const { error } = await supabase.from("assets").upsert(batch, {
        onConflict: 'external_id',
        ignoreDuplicates: true,
      });
      
      if (error) {
        // Fallback to insert ignoring duplicates
        console.log("Upsert failed, trying insert:", error.message);
        const { error: insertError } = await supabase.from("assets").insert(batch);
        if (insertError) {
          console.error("Insert error:", insertError);
          skipped += batch.length;
          continue;
        }
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, imported: inserted, linked, skipped, total: uniqueAssets.size }),
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
