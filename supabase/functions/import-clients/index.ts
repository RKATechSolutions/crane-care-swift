import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map CSV header names to DB column names
const HEADER_MAP: Record<string, string> = {
  'client name': 'client_name',
  'status': 'status',
  'abn': 'abn',
  'primary contact': 'primary_contact_name',
  'automatic service package': 'automatic_service_package',
  'business type': 'business_type',
  'casual service rates': 'casual_service_rates',
  'comments or notes': 'comments_or_notes',
  'google drive link': 'google_drive_link',
  'inspectall account link': 'inspectall_account_link',
  'inspectall code': 'inspectall_code',
  'lead or referral source': 'lead_or_referral_source',
  'payment days or dates you pay invoices': 'payment_days',
  'preferred days and times to complete work': 'preferred_days_and_times',
  'priority service package': 'priority_service_package',
  'required to complete work': 'required_to_complete_work',
  'send schedule reminders': 'send_schedule_reminders',
  'services interested in': 'services_interested_in',
  'site induction details': 'site_induction_details',
  'travel time one way from riverstone': 'travel_time_from_base',
  'cfloc planned service dates': 'planned_service_dates',
  // Legacy column mappings for older CSV formats
  'location address': 'location_address',
  'primary contact email': 'primary_contact_email',
  'primary contact mobile': 'primary_contact_mobile',
  'primary contact given name': 'primary_contact_given_name',
  'primary contact surname': 'primary_contact_surname',
  'primary contact position': 'primary_contact_position',
};

// Columns that are valid for upsert into the clients table
const VALID_CLIENT_COLUMNS = new Set([
  'client_name', 'status', 'abn', 'primary_contact_name',
  'automatic_service_package', 'business_type', 'casual_service_rates',
  'comments_or_notes', 'google_drive_link', 'inspectall_account_link',
  'inspectall_code', 'lead_or_referral_source', 'payment_days',
  'preferred_days_and_times', 'priority_service_package',
  'required_to_complete_work', 'send_schedule_reminders',
  'services_interested_in', 'site_induction_details',
  'travel_time_from_base', 'planned_service_dates',
  'location_address', 'primary_contact_email', 'primary_contact_mobile',
  'primary_contact_given_name', 'primary_contact_surname',
  'primary_contact_position',
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvUrl } = await req.json();
    
    const csvResponse = await fetch(csvUrl);
    const csvData = await csvResponse.text();
    
    console.log("CSV length:", csvData.length);
    
    const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim());
    console.log("Total lines:", lines.length);

    if (lines.length < 2) {
      throw new Error("CSV has no data rows");
    }
    
    // Parse header row to build column index mapping
    const headerValues = parseCSVLine(lines[0]);
    const columnMap: { index: number; dbColumn: string }[] = [];
    
    for (let i = 0; i < headerValues.length; i++) {
      const headerNorm = headerValues[i].trim().toLowerCase().replace(/['"]/g, '');
      const dbCol = HEADER_MAP[headerNorm];
      if (dbCol && VALID_CLIENT_COLUMNS.has(dbCol)) {
        columnMap.push({ index: i, dbColumn: dbCol });
      }
    }

    console.log(`Mapped ${columnMap.length} columns:`, columnMap.map(c => c.dbColumn));

    // Parse data rows
    const clientRows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const row: Record<string, any> = {};
      for (const col of columnMap) {
        const val = values[col.index]?.trim() || null;
        // Don't store empty strings
        row[col.dbColumn] = val && val.length > 0 ? val : null;
      }

      if (!row.client_name) continue;

      // Default status to Active if not provided
      if (!row.status) row.status = 'Active';

      clientRows.push(row);
    }

    console.log(`Parsed ${clientRows.length} client rows`);

    // Deduplicate by client_name (keep last occurrence which has the most data)
    const dedupedMap = new Map<string, Record<string, any>>();
    for (const row of clientRows) {
      const existing = dedupedMap.get(row.client_name);
      if (existing) {
        // Merge: keep non-null values from both, preferring new values
        for (const [key, val] of Object.entries(row)) {
          if (val !== null) existing[key] = val;
        }
      } else {
        dedupedMap.set(row.client_name, { ...row });
      }
    }
    const dedupedRows = Array.from(dedupedMap.values());
    console.log(`Deduped to ${dedupedRows.length} unique clients`);

    // Upsert in batches of 50
    let upserted = 0;
    for (let i = 0; i < dedupedRows.length; i += 50) {
      const batch = dedupedRows.slice(i, i + 50);
      const { error } = await supabase
        .from("clients")
        .upsert(batch, { onConflict: "client_name" });
      if (error) {
        console.error(`Batch ${i} error:`, error);
        throw error;
      }
      upserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        clients: upserted,
        columns_mapped: columnMap.map(c => c.dbColumn),
        message: `Imported ${upserted} clients with ${columnMap.length} fields`,
      }),
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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
