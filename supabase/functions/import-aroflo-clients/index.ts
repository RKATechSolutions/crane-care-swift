import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateHmacSignature(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uEncoded = Deno.env.get('AROFLO_U_ENCODED');
    const pEncoded = Deno.env.get('AROFLO_P_ENCODED');
    const secretKey = Deno.env.get('AROFLO_SECRET_KEY');
    const orgEncoded = Deno.env.get('AROFLO_ORG_ENCODED');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!uEncoded || !pEncoded || !secretKey || !orgEncoded) {
      throw new Error('Missing AroFlo API credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all clients with pagination
    let allClients: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const urlVarString = [
        'zone=' + encodeURIComponent('clients'),
        'where=' + encodeURIComponent('and|archived|=|false'),
        'page=' + encodeURIComponent(String(page)),
        'join=' + encodeURIComponent('contacts,locations'),
      ].join('&');

      // Generate timestamp in ISO format for the header
      const now = new Date();
      const afDatetimeUtc = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

      // Build the HMAC auth string
      // The message to sign is: uEncoded + orgEncoded + afdatetimeutc
      // For GET requests the URL query string is also part of it
      const authMessage = uEncoded + orgEncoded + afDatetimeUtc;
      const hmacSignature = await generateHmacSignature(authMessage, secretKey);

      // Authorization is base64 of uEncoded:pEncoded
      const authorizationValue = btoa(uEncoded + ':' + pEncoded);

      const apiUrl = `https://api.aroflo.com/?${urlVarString}`;
      console.log(`Fetching AroFlo clients page ${page}...`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authentication': `HMAC ${hmacSignature}`,
          'Authorization': authorizationValue,
          'Accept': 'text/json',
          'afdatetimeutc': afDatetimeUtc,
          'orgEncoded': orgEncoded,
          'uEncoded': uEncoded,
          'pEncoded': pEncoded,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`AroFlo API error [${response.status}]: ${body}`);
      }

      const data = await response.json();
      console.log(`AroFlo response status: ${data.status}, message: ${data.statusmessage}`);

      if (data.status !== '0' && data.status !== 0) {
        throw new Error(`AroFlo API login failed: ${data.statusmessage}`);
      }

      const clients = data.zoneresponse?.clients || [];
      allClients = allClients.concat(clients);

      const currentPageResults = data.zoneresponse?.currentpageresults || 0;
      const maxPageResults = parseInt(data.zoneresponse?.maxpageresults || '500');
      
      if (currentPageResults < maxPageResults) {
        hasMore = false;
      } else {
        page++;
      }

      // Rate limit: max 1 request per second
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    console.log(`Total AroFlo clients fetched: ${allClients.length}`);

    // Upsert clients into database
    let inserted = 0;
    let updated = 0;

    for (const client of allClients) {
      const clientName = client.clientname || '';
      if (!clientName) continue;

      // Build address from location data
      const location = client.locations?.[0] || {};
      const address = location.address || {};
      const addressParts = [
        address.addressline1,
        address.addressline2,
        address.suburb,
        address.state,
        address.postcode,
      ].filter(Boolean);
      const locationAddress = addressParts.join(', ') || client.address?.addressline1 || '';

      // Get primary contact info
      const primaryContact = client.contacts?.[0] || {};
      const contactName = [primaryContact.givennames, primaryContact.surname].filter(Boolean).join(' ');

      // Check if client already exists by name
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('client_name', clientName)
        .maybeSingle();

      if (existing) {
        // Update
        await supabase
          .from('clients')
          .update({
            location_address: locationAddress || null,
            primary_contact_name: contactName || null,
            primary_contact_mobile: primaryContact.mobile || null,
            primary_contact_email: primaryContact.email || null,
            primary_contact_given_name: primaryContact.givennames || null,
            primary_contact_surname: primaryContact.surname || null,
            primary_contact_position: primaryContact.position || null,
            status: 'Active',
          })
          .eq('id', existing.id);
        updated++;
      } else {
        // Insert
        await supabase
          .from('clients')
          .insert({
            client_name: clientName,
            location_address: locationAddress || null,
            primary_contact_name: contactName || null,
            primary_contact_mobile: primaryContact.mobile || null,
            primary_contact_email: primaryContact.email || null,
            primary_contact_given_name: primaryContact.givennames || null,
            primary_contact_surname: primaryContact.surname || null,
            primary_contact_position: primaryContact.position || null,
            status: 'Active',
          });
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: allClients.length, 
        inserted, 
        updated,
        message: `Imported ${inserted} new clients, updated ${updated} existing clients` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing AroFlo clients:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
