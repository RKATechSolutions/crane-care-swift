import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map CSV/XLS header names to DB column names
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
  // Legacy column mappings
  'location address': 'location_address',
  'primary contact email': 'primary_contact_email',
  'primary contact mobile': 'primary_contact_mobile',
  'primary contact given name': 'primary_contact_given_name',
  'primary contact surname': 'primary_contact_surname',
  'primary contact position': 'primary_contact_position',
};

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

    const body = await req.json();
    const fileUrl = body.csvUrl || body.fileUrl;
    
    const fileResponse = await fetch(fileUrl);
    const contentType = fileResponse.headers.get("content-type") || "";
    const isExcel = fileUrl.match(/\.xls[x]?$/i) || 
                    contentType.includes("spreadsheet") || 
                    contentType.includes("excel") ||
                    contentType.includes("octet-stream");

    let rows: Record<string, string>[];

    if (isExcel) {
      console.log("Parsing as Excel file");
      const arrayBuffer = await fileResponse.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][];
      
      if (jsonData.length < 2) throw new Error("File has no data rows");
      
      const headers = (jsonData[0] as string[]).map(h => String(h).trim().toLowerCase().replace(/['"]/g, ''));
      const columnMap: { index: number; dbColumn: string }[] = [];
      
      for (let i = 0; i < headers.length; i++) {
        const dbCol = HEADER_MAP[headers[i]];
        if (dbCol && VALID_CLIENT_COLUMNS.has(dbCol)) {
          columnMap.push({ index: i, dbColumn: dbCol });
        }
      }
      
      console.log(`Mapped ${columnMap.length} columns:`, columnMap.map(c => c.dbColumn));
      
      rows = [];
      for (let i = 1; i < jsonData.length; i++) {
        const values = jsonData[i] as string[];
        const row: Record<string, any> = {};
        for (const col of columnMap) {
          const val = values[col.index] != null ? String(values[col.index]).trim() : null;
          row[col.dbColumn] = val && val.length > 0 ? val : null;
        }
        if (row.client_name) rows.push(row);
      }
    } else {
      console.log("Parsing as CSV file");
      const csvData = await fileResponse.text();
      const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim());
      if (lines.length < 2) throw new Error("CSV has no data rows");
      
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
      
      rows = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 2) continue;
        const row: Record<string, any> = {};
        for (const col of columnMap) {
          const val = values[col.index]?.trim() || null;
          row[col.dbColumn] = val && val.length > 0 ? val : null;
        }
        if (row.client_name) rows.push(row);
      }
    }

    console.log(`Parsed ${rows.length} client rows`);

    // Default status & deduplicate
    for (const row of rows) {
      if (!row.status) row.status = 'Active';
    }

    const dedupedMap = new Map<string, Record<string, any>>();
    for (const row of rows) {
      const existing = dedupedMap.get(row.client_name);
      if (existing) {
        for (const [key, val] of Object.entries(row)) {
          if (val !== null) existing[key] = val;
        }
      } else {
        dedupedMap.set(row.client_name, { ...row });
      }
    }
    const dedupedRows = Array.from(dedupedMap.values());
    console.log(`Deduped to ${dedupedRows.length} unique clients`);

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
        message: `Imported ${upserted} clients`,
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
