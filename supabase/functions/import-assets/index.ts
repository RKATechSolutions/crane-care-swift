import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive map from possible InspectAll/Excel header names (lowercase) to DB column names
const HEADER_MAP: Record<string, string> = {
  // Core identifiers
  'id': 'external_id',
  'assetid': 'external_id',
  'asset id': 'external_id',
  'classname': 'class_name',
  'class name': 'class_name',
  'className': 'class_name',
  'id1': 'asset_id1',
  'asset id1': 'asset_id1',
  'id2': 'asset_id2',
  'asset id2': 'asset_id2',
  'status': 'status',
  'barcode': 'barcode',

  // Account/client info
  'accountid': 'account_id',
  'account id': 'account_id',
  'accountname': 'account_name',
  'account name': 'account_name',
  'accountnum': 'account_num',
  'account num': 'account_num',

  // Location
  'locationid': 'location_id',
  'location id': 'location_id',
  'locationname': 'location_name',
  'location name': 'location_name',
  'locationnum': 'location_num',
  'location num': 'location_num',
  'areaname': 'area_name',
  'area name': 'area_name',

  // Description/notes
  'description': 'description',
  'urgentnote': 'urgent_note',
  'urgent note': 'urgent_note',
  'notes': 'notes',

  // Geo
  'latitude': 'latitude',
  'longitude': 'longitude',

  // Timestamps
  'createdat': 'asset_created_at',
  'created at': 'asset_created_at',
  'createdbyid': 'created_by_id',
  'created by id': 'created_by_id',

  // Custom fields - Type/Capacity/Manufacturer etc.
  'type': 'asset_type',
  'asset type': 'asset_type',
  'capacity': 'capacity',
  'swl': 'swl_tonnes',
  'swl (tonnes)': 'swl_tonnes',
  'swl tonnes': 'swl_tonnes',
  'manufacturer': 'manufacturer',
  'brand/make': 'brand_make',
  'brand / make': 'brand_make',
  'brand_make': 'brand_make',
  'model number': 'model_number',
  'modelnumber': 'model_number',
  'serial number': 'serial_number',
  'serialnumber': 'serial_number',
  'length/lift': 'length_lift',
  'length': 'length_lift',
  'lengthlift': 'length_lift',
  'lift height (m)': 'lift_height_m',
  'lift height': 'lift_height_m',
  'hook type': 'hook_type',
  'hooktype': 'hook_type',
  'power': 'power',
  'power supply': 'power_supply',
  'powersupply': 'power_supply',

  // Pendant/Remote
  'pendant/remote': 'pendant_remote',
  'pendantremote': 'pendant_remote',
  'pendant brand': 'pendant_brand',
  'pendantbrand': 'pendant_brand',

  // Crane details
  'crane manufacturer': 'crane_manufacturer',
  'cranemanufacturer': 'crane_manufacturer',
  'hoist configuration': 'hoist_configuration',
  'hoistconfiguration': 'hoist_configuration',
  'trolley configuration': 'trolley_configuration',
  'trolleyconfiguration': 'trolley_configuration',
  'trolley serial number': 'trolley_serial',
  'trolleyserial': 'trolley_serial',
  'control type': 'control_type',
  'controltype': 'control_type',
  'configuration': 'configuration',
  'grade & size': 'grade_size',
  'grade&size': 'grade_size',
  'gradesize': 'grade_size',
  'grade size': 'grade_size',

  // Hoist 1
  'lifting medium, hoist 1': 'lifting_medium_hoist1',
  'lifting medium hoist 1': 'lifting_medium_hoist1',
  'liftingmediumhoist1': 'lifting_medium_hoist1',
  'manufacturer, hoist 1': 'manufacturer_hoist1',
  'manufacturer hoist 1': 'manufacturer_hoist1',
  'manufacturerhoist1': 'manufacturer_hoist1',
  'model number, hoist 1': 'model_hoist1',
  'model number hoist 1': 'model_hoist1',
  'modelhoist1': 'model_hoist1',
  'serial number, hoist 1': 'serial_hoist1',
  'serial number hoist 1': 'serial_hoist1',
  'serialhoist1': 'serial_hoist1',

  // Hoist 2
  'lifting medium, hoist 2': 'lifting_medium_hoist2',
  'lifting medium hoist 2': 'lifting_medium_hoist2',
  'liftingmediumhoist2': 'lifting_medium_hoist2',
  'manufacturer, hoist 2': 'manufacturer_hoist2',
  'manufacturer hoist 2': 'manufacturer_hoist2',
  'manufacturerhoist2': 'manufacturer_hoist2',
  'model number, hoist 2': 'model_hoist2',
  'model number hoist 2': 'model_hoist2',
  'modelhoist2': 'model_hoist2',
  'serial number, hoist 2': 'serial_hoist2',
  'serial number hoist 2': 'serial_hoist2',
  'serialhoist2': 'serial_hoist2',

  // Extended fields
  'crane classification': 'crane_classification',
  'craneclassification': 'crane_classification',
  'duty class': 'duty_class',
  'dutyclass': 'duty_class',
  'design standard': 'design_standard',
  'designstandard': 'design_standard',
  'environment exposure': 'environment_exposure',
  'environmentexposure': 'environment_exposure',
  'crane operational status': 'crane_operational_status',
  'craneoperationalstatus': 'crane_operational_status',
  'asset criticality level': 'asset_criticality_level',
  'assetcriticalitylevel': 'asset_criticality_level',
  'compliance status': 'compliance_status',
  'compliancestatus': 'compliance_status',
  'service class/usage intensity': 'service_class_usage_intensity',
  'service class usage intensity': 'service_class_usage_intensity',
  'serviceclassusageintensity': 'service_class_usage_intensity',
  'asset lifecycle stage': 'asset_lifecycle_stage',
  'assetlifecyclestage': 'asset_lifecycle_stage',
  'replacement risk category': 'replacement_risk_category',
  'replacementriskcategory': 'replacement_risk_category',
  'year manufactured': 'year_manufactured',
  'yearmanufactured': 'year_manufactured',
  'installation date': 'installation_date',
  'installationdate': 'installation_date',
  'commission date': 'commission_date',
  'commissiondate': 'commission_date',
  'structural design life (years)': 'structural_design_life_years',
  'structural design life years': 'structural_design_life_years',
  'structuraldesignlifeyears': 'structural_design_life_years',
  'major inspection due date': 'major_inspection_due_date',
  'majorinspectionduedate': 'major_inspection_due_date',
  'major inspection interval (years)': 'major_inspection_interval_years',
  'major inspection interval years': 'major_inspection_interval_years',
  'majorinspectionintervalyears': 'major_inspection_interval_years',
  'access suggestion': 'access_suggestion',
  'accesssuggestion': 'access_suggestion',
};

// Columns that should be numeric
const NUMERIC_COLS = new Set([
  'latitude', 'longitude', 'lift_height_m',
  'year_manufactured', 'structural_design_life_years',
  'major_inspection_interval_years',
]);

// All valid DB columns for assets
const VALID_COLS = new Set([
  'external_id', 'class_name', 'asset_id1', 'asset_id2', 'status',
  'account_id', 'account_name', 'account_num', 'barcode',
  'location_id', 'location_name', 'location_num', 'area_name',
  'description', 'urgent_note', 'notes', 'latitude', 'longitude',
  'asset_created_at', 'created_by_id', 'asset_type', 'capacity',
  'manufacturer', 'brand_make', 'model_number', 'serial_number',
  'length_lift', 'power', 'power_supply', 'pendant_remote',
  'crane_manufacturer', 'hoist_configuration', 'trolley_configuration',
  'lifting_medium_hoist1', 'manufacturer_hoist1', 'model_hoist1', 'serial_hoist1',
  'lifting_medium_hoist2', 'manufacturer_hoist2', 'model_hoist2', 'serial_hoist2',
  'control_type', 'pendant_brand', 'trolley_serial', 'configuration',
  'grade_size', 'hook_type', 'client_id', 'swl_tonnes',
  'installation_date', 'major_inspection_due_date', 'asset_criticality_level',
  'crane_operational_status', 'environment_exposure', 'lift_height_m',
  'crane_classification', 'design_standard', 'compliance_status',
  'service_class_usage_intensity', 'commission_date',
  'structural_design_life_years', 'major_inspection_interval_years',
  'asset_lifecycle_stage', 'replacement_risk_category',
  'year_manufactured', 'duty_class', 'access_suggestion',
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { assets, headers: rawHeaders, mode } = await req.json();

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      throw new Error("No assets provided");
    }

    // Get all clients for linking
    const { data: allClients } = await supabase
      .from("clients")
      .select("id, client_name");

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
      if (exactMap.has(lower)) return exactMap.get(lower)!;
      for (const c of clientNames) {
        if (c.lower.includes(lower) || lower.includes(c.lower)) return c.id;
      }
      const firstWord = lower.split(' ')[0];
      if (firstWord.length >= 4) {
        for (const c of clientNames) {
          if (c.lower.startsWith(firstWord)) return c.id;
        }
      }
      return null;
    }

    // Build column index from headers if provided (array-based rows)
    let colMap: Record<number, string> | null = null;
    if (rawHeaders && Array.isArray(rawHeaders)) {
      colMap = {};
      const unmapped: string[] = [];
      for (let i = 0; i < rawHeaders.length; i++) {
        const h = String(rawHeaders[i]).trim();
        const hLower = h.toLowerCase().replace(/[_\s]+/g, ' ').trim();
        const hNoSpace = hLower.replace(/\s+/g, '');
        const dbCol = HEADER_MAP[hLower] || HEADER_MAP[hNoSpace] || HEADER_MAP[h.toLowerCase()];
        if (dbCol && VALID_COLS.has(dbCol)) {
          colMap[i] = dbCol;
        } else {
          unmapped.push(h);
        }
      }
      console.log(`Mapped ${Object.keys(colMap).length} columns, unmapped: ${unmapped.join(', ')}`);
    }

    // If mode is "update", upsert by external_id. Otherwise clear and insert.
    if (mode !== 'update') {
      await supabase.from("assets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    let inserted = 0;
    let linked = 0;
    const batchSize = 50;

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize).map((a: any) => {
        let row: Record<string, any> = {};

        if (colMap && Array.isArray(a)) {
          // Array-based row with column mapping
          for (const [idx, col] of Object.entries(colMap)) {
            const val = a[Number(idx)];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              if (NUMERIC_COLS.has(col)) {
                const num = parseFloat(String(val));
                row[col] = isNaN(num) ? null : num;
              } else {
                row[col] = String(val).trim();
              }
            }
          }
        } else {
          // Object-based row (legacy format) - use dynamic key matching
          for (const [key, val] of Object.entries(a)) {
            if (val === undefined || val === null || String(val).trim() === '') continue;
            const kLower = key.toLowerCase().replace(/[_\s]+/g, ' ').trim();
            const kNoSpace = kLower.replace(/\s+/g, '');
            const dbCol = HEADER_MAP[kLower] || HEADER_MAP[kNoSpace] || HEADER_MAP[key.toLowerCase()];
            if (dbCol && VALID_COLS.has(dbCol)) {
              if (NUMERIC_COLS.has(dbCol)) {
                const num = parseFloat(String(val));
                row[dbCol] = isNaN(num) ? null : num;
              } else {
                row[dbCol] = String(val).trim();
              }
            }
          }
        }

        // Ensure class_name has a value
        if (!row.class_name) row.class_name = 'Unknown';

        // Link to client
        const accountName = row.account_name || null;
        const clientId = findClientId(accountName);
        if (clientId) {
          linked++;
          row.client_id = clientId;
        }

        return row;
      });

      if (mode === 'update') {
        const { error } = await supabase.from("assets").upsert(batch, {
          onConflict: 'external_id',
          ignoreDuplicates: false,
        });
        if (error) {
          console.error("Upsert error:", error);
          // Fallback to individual inserts
          for (const item of batch) {
            if (item.external_id) {
              const { error: updateErr } = await supabase
                .from("assets")
                .update(item)
                .eq("external_id", item.external_id);
              if (updateErr) {
                const { error: insertErr } = await supabase.from("assets").insert(item);
                if (insertErr) console.error("Single insert error:", insertErr);
              }
            } else {
              await supabase.from("assets").insert(item);
            }
          }
        }
      } else {
        const { error } = await supabase.from("assets").insert(batch);
        if (error) {
          console.error("Batch insert error:", error);
          throw error;
        }
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
