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

    const { csvUrl } = await req.json();
    
    // Fetch CSV from URL
    const csvResponse = await fetch(csvUrl);
    const csvData = await csvResponse.text();
    
    console.log("CSV length:", csvData.length, "First 200 chars:", csvData.substring(0, 200));
    
    // Parse CSV - handle both \n and \r\n
    const lines = csvData.split(/\r?\n/).filter((l: string) => l.trim());
    console.log("Total lines:", lines.length);
    
    // Deduplicate clients and collect contacts
    const clientMap = new Map<string, any>();
    const contacts: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue;
      
      const clientName = values[0]?.trim();
      if (!clientName) continue;

      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, {
          client_name: clientName,
          primary_contact_name: values[1]?.trim() || null,
          location_address: values[2]?.trim() || null,
          primary_contact_email: values[3]?.trim() || null,
          primary_contact_mobile: values[4]?.trim() || null,
          primary_contact_given_name: values[5]?.trim() || null,
          primary_contact_surname: values[6]?.trim() || null,
          send_schedule_reminders: values[7]?.trim() || null,
          site_induction_details: values[8]?.trim() || null,
          created_date: values[9]?.trim() || null,
          primary_contact_position: values[17]?.trim() || null,
        });
      }

      // Other contact
      const otherName = values[10]?.trim();
      const otherEmail = values[11]?.trim();
      if (otherName && otherName !== ". ." && otherName !== ".") {
        contacts.push({
          client_name: clientName,
          contact_name: otherName,
          contact_email: otherEmail || null,
          contact_given_name: values[12]?.trim() || null,
          contact_mobile: values[13]?.trim() || null,
          contact_phone: values[14]?.trim() || null,
          contact_position: values[15]?.trim() || null,
          contact_surname: values[16]?.trim() || null,
          status: values[18]?.trim()?.replace(/,\s*$/, '') || 'Active',
        });
      }
    }

    // Insert clients
    const clientRows = Array.from(clientMap.values());
    const { error: clientError } = await supabase
      .from("clients")
      .upsert(clientRows, { onConflict: "client_name" });

    if (clientError) throw clientError;

    // Get client IDs
    const { data: allClients, error: fetchError } = await supabase
      .from("clients")
      .select("id, client_name");
    if (fetchError) throw fetchError;

    const clientIdMap = new Map(allClients!.map((c: any) => [c.client_name, c.id]));

    // Deduplicate contacts by client + name + email
    const seen = new Set<string>();
    const uniqueContacts = contacts.filter(c => {
      const key = `${c.client_name}|${c.contact_name}|${c.contact_email}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Insert contacts
    const contactRows = uniqueContacts
      .map(c => ({
        client_id: clientIdMap.get(c.client_name),
        contact_name: c.contact_name,
        contact_email: c.contact_email,
        contact_given_name: c.contact_given_name,
        contact_mobile: c.contact_mobile,
        contact_phone: c.contact_phone,
        contact_position: c.contact_position,
        contact_surname: c.contact_surname,
        status: c.status,
      }))
      .filter(c => c.client_id);

    // Insert in batches of 100
    let insertedContacts = 0;
    for (let i = 0; i < contactRows.length; i += 100) {
      const batch = contactRows.slice(i, i + 100);
      const { error: contactError } = await supabase
        .from("client_contacts")
        .insert(batch);
      if (contactError) throw contactError;
      insertedContacts += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        clients: clientRows.length,
        contacts: insertedContacts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
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
