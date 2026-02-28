import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface DefectItem {
  itemLabel: string;
  craneName: string;
  severity: string;
  defectType: string;
  rectificationTimeframe: string;
  notes: string;
  recommendedAction: string;
}

interface QuoteRequest {
  clientName: string;
  siteName: string;
  siteAddress: string;
  defects: DefectItem[];
  technicianName: string;
  jobDate: string;
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

    if (!uEncoded || !pEncoded || !secretKey || !orgEncoded) {
      throw new Error('Missing AroFlo API credentials');
    }

    const body: QuoteRequest = await req.json();
    const { clientName, siteName, siteAddress, defects, technicianName, jobDate } = body;

    if (!defects || defects.length === 0) {
      throw new Error('No defect items provided for quoting');
    }

    // Build quote description from defects
    const descriptionLines = defects.map((d, i) => 
      `${i + 1}. [${d.severity}] ${d.itemLabel} (${d.craneName}) - ${d.defectType}\n   Timeframe: ${d.rectificationTimeframe}\n   Action: ${d.recommendedAction}\n   ${d.notes ? 'Notes: ' + d.notes : ''}`
    ).join('\n\n');

    const quoteName = `${clientName} - Repair Quote - ${jobDate}`;
    const description = `Defects identified during inspection at ${siteName} on ${jobDate} by ${technicianName}.\n\n${descriptionLines}`;

    // Build postxml for creating a quote in AroFlo
    // The Quotes zone accepts: quotename, client (clientname), location, description, tasktype
    const postxml = `<quotes><quote><quotename><![CDATA[${escapeXml(quoteName)}]]></quotename><client><clientname><![CDATA[${escapeXml(clientName)}]]></clientname></client><description><![CDATA[${escapeXml(description)}]]></description></quote></quotes>`;

    // Build form body
    const formBody = `zone=${encodeURIComponent('quotes')}&postxml=${encodeURIComponent(postxml)}`;

    // Generate HMAC auth
    const now = new Date();
    const afDatetimeUtc = now.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
    const authorization = `uencoded=${encodeURIComponent(uEncoded)}&pencoded=${encodeURIComponent(pEncoded)}&orgEncoded=${encodeURIComponent(orgEncoded)}`;

    const method = 'POST';
    const urlPath = '';
    const accept = 'text/json';
    const payloadString = [method, urlPath, accept, authorization, afDatetimeUtc, formBody].join('+');
    
    const hmacSignature = await generateHmacSignature(payloadString, secretKey);

    console.log('Creating AroFlo quote:', quoteName);
    console.log('Defects count:', defects.length);

    const response = await fetch('https://api.aroflo.com/', {
      method: 'POST',
      headers: {
        'Authentication': `HMAC ${hmacSignature}`,
        'Authorization': authorization,
        'Accept': accept,
        'afdatetimeutc': afDatetimeUtc,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    const responseText = await response.text();
    console.log(`AroFlo response status: ${response.status}`);
    console.log(`AroFlo response: ${responseText.substring(0, 500)}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`AroFlo returned non-JSON response: ${responseText.substring(0, 200)}`);
    }

    if (data.status !== '0' && data.status !== 0) {
      throw new Error(`AroFlo API error (status ${data.status}): ${data.statusmessage}`);
    }

    // Extract quote ID from response
    const inserts = data.zoneresponse?.postresults?.inserts?.quotes || [];
    const quoteId = inserts[0]?.quoteid || null;

    return new Response(
      JSON.stringify({ 
        success: true,
        quoteId,
        quoteName,
        message: `Draft quote "${quoteName}" created in AroFlo with ${defects.length} defect item(s)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating AroFlo quote:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
