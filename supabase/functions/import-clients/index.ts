// import-clients
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map CSV header names to DB column names for clients table
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
  'location address': 'location_address',
  'primary contact email': 'primary_contact_email',
  'primary contact mobile': 'primary_contact_mobile',
  'primary contact given name': 'primary_contact_given_name',
  'primary contact surname': 'primary_contact_surname',
  'primary contact position': 'primary_contact_position',
  'company address 1': 'location_address',
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

// Other contacts column header mapping
const CONTACT_HEADER_MAP: Record<string, string> = {
  'other contacts': 'contact_name',
  'other contacts email': 'contact_email',
  'other contacts given name': 'contact_given_name',
  'other contacts mobile': 'contact_mobile',
  'other contacts phone': 'contact_phone',
  'other contacts position': 'contact_position',
  'other contacts status': 'status',
  'other contacts surname': 'contact_surname',
};

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
    const csvData = await fileResponse.text();

    console.log("CSV length:", csvData.length);

    const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim());
    console.log("Total lines:", lines.length);

    if (lines.length < 2) throw new Error("CSV has no data rows");

    // Parse headers
    const headerValues = parseCSVLine(lines[0]);
    const clientColumnMap: { index: number; dbColumn: string }[] = [];
    const contactColumnMap: { index: number; dbColumn: string }[] = [];
    let companyAddress2Index = -1;

    for (let i = 0; i < headerValues.length; i++) {
      const headerNorm = headerValues[i].trim().toLowerCase().replace(/['"]/g, '');

      // Track Company Address 2 separately (append to location_address)
      if (headerNorm === 'company address 2') {
        companyAddress2Index = i;
        continue;
      }

      const clientDbCol = HEADER_MAP[headerNorm];
      if (clientDbCol && VALID_CLIENT_COLUMNS.has(clientDbCol)) {
        clientColumnMap.push({ index: i, dbColumn: clientDbCol });
      }

      const contactDbCol = CONTACT_HEADER_MAP[headerNorm];
      if (contactDbCol) {
        contactColumnMap.push({ index: i, dbColumn: contactDbCol });
      }
    }

    console.log(`Mapped ${clientColumnMap.length} client columns, ${contactColumnMap.length} contact columns`);

    // Parse all rows into per-client data + contacts
    interface ParsedRow {
      clientData: Record<string, any>;
      contactData: Record<string, any> | null;
    }

    const parsedRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      // Client fields
      const clientRow: Record<string, any> = {};
      for (const col of clientColumnMap) {
        const val = values[col.index]?.trim() || null;
        if (val && val.length > 0) {
          // If column already set (e.g. location_address from company address 1), don't overwrite with empty
          if (!clientRow[col.dbColumn]) {
            clientRow[col.dbColumn] = val;
          }
        }
      }

      // Append Company Address 2 to location_address if present
      if (companyAddress2Index >= 0) {
        const addr2 = values[companyAddress2Index]?.trim();
        if (addr2) {
          clientRow.location_address = clientRow.location_address
            ? `${addr2}, ${clientRow.location_address}`
            : addr2;
        }
      }

      if (!clientRow.client_name) continue;
      if (!clientRow.status) clientRow.status = 'Active';

      // Contact fields
      let contactData: Record<string, any> | null = null;
      if (contactColumnMap.length > 0) {
        const contact: Record<string, any> = {};
        for (const col of contactColumnMap) {
          const val = values[col.index]?.trim() || null;
          contact[col.dbColumn] = val && val.length > 0 ? val : null;
        }
        // Only create contact if it has a name or email
        if (contact.contact_name || contact.contact_email) {
          contactData = contact;
        }
      }

      parsedRows.push({ clientData: clientRow, contactData });
    }

    console.log(`Parsed ${parsedRows.length} rows`);

    // Deduplicate clients (merge by client_name, keep non-null values)
    const dedupedClients = new Map<string, Record<string, any>>();
    // Collect contacts per client
    const clientContacts = new Map<string, Map<string, Record<string, any>>>();

    for (const { clientData, contactData } of parsedRows) {
      const name = clientData.client_name;
      const existing = dedupedClients.get(name);
      if (existing) {
        for (const [key, val] of Object.entries(clientData)) {
          if (val !== null && val !== undefined) existing[key] = val;
        }
      } else {
        dedupedClients.set(name, { ...clientData });
      }

      // Deduplicate contacts by name+email combo
      if (contactData) {
        if (!clientContacts.has(name)) clientContacts.set(name, new Map());
        const contactKey = `${contactData.contact_name || ''}|${contactData.contact_email || ''}`;
        if (!clientContacts.get(name)!.has(contactKey)) {
          clientContacts.get(name)!.set(contactKey, contactData);
        }
      }
    }

    const clientRows = Array.from(dedupedClients.values());
    console.log(`Deduped to ${clientRows.length} unique clients`);

    // Upsert clients in batches of 50
    let upserted = 0;
    for (let i = 0; i < clientRows.length; i += 50) {
      const batch = clientRows.slice(i, i + 50);
      const { error } = await supabase
        .from("clients")
        .upsert(batch, { onConflict: "client_name" });
      if (error) {
        console.error(`Client batch ${i} error:`, error);
        throw error;
      }
      upserted += batch.length;
    }
    console.log(`Upserted ${upserted} clients`);

    // Now import contacts - fetch client IDs first
    let contactsImported = 0;
    const clientNames = Array.from(clientContacts.keys());

    if (clientNames.length > 0) {
      // Fetch all client IDs
      const { data: clientIdData } = await supabase
        .from("clients")
        .select("id, client_name")
        .in("client_name", clientNames);

      const clientIdMap = new Map<string, string>();
      if (clientIdData) {
        for (const c of clientIdData) {
          clientIdMap.set(c.client_name, c.id);
        }
      }

      // Build contact rows
      const allContacts: Record<string, any>[] = [];
      for (const [clientName, contacts] of clientContacts.entries()) {
        const clientId = clientIdMap.get(clientName);
        if (!clientId) continue;
        for (const contact of contacts.values()) {
          // Skip if contact_name is just dots or empty
          const cleanName = (contact.contact_name || '').replace(/[.\s]/g, '');
          if (!cleanName && !contact.contact_email) continue;

          allContacts.push({
            client_id: clientId,
            ...contact,
          });
        }
      }

      console.log(`Importing ${allContacts.length} contacts`);

      // Delete existing contacts and re-insert (full refresh)
      const uniqueClientIds = [...new Set(allContacts.map(c => c.client_id))];
      for (const cid of uniqueClientIds) {
        await supabase.from("client_contacts").delete().eq("client_id", cid);
      }

      // Insert in batches of 50
      for (let i = 0; i < allContacts.length; i += 50) {
        const batch = allContacts.slice(i, i + 50);
        const { error } = await supabase.from("client_contacts").upsert(batch);
        if (error) {
          console.error(`Contact batch ${i} error:`, error);
        } else {
          contactsImported += batch.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        clients: upserted,
        contacts: contactsImported,
        message: `Imported ${upserted} clients and ${contactsImported} contacts`,
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
