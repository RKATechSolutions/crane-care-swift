import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateHmacSignature(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(message);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const uEncoded = Deno.env.get('AROFLO_U_ENCODED')!;
    const pEncoded = Deno.env.get('AROFLO_P_ENCODED')!;
    const secretKey = Deno.env.get('AROFLO_SECRET_KEY')!;
    const orgEncoded = Deno.env.get('AROFLO_ORG_ENCODED')!;

    // Fetch just 1 client with customfields join
    const urlVarString = [
      'zone=' + encodeURIComponent('clients'),
      'where=' + encodeURIComponent('and|archived|=|false'),
      'page=1',
      'join=' + encodeURIComponent('contacts,locations,customfields'),
    ].join('&');

    const now = new Date();
    const afDatetimeUtc = now.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
    const authorization = `uencoded=${encodeURIComponent(uEncoded)}&pencoded=${encodeURIComponent(pEncoded)}&orgEncoded=${encodeURIComponent(orgEncoded)}`;
    const payloadString = ['GET', '', 'text/json', authorization, afDatetimeUtc, urlVarString].join('+');
    const hmacSignature = await generateHmacSignature(payloadString, secretKey);

    const response = await fetch(`https://api.aroflo.com/?${urlVarString}`, {
      method: 'GET',
      headers: {
        'Authentication': `HMAC ${hmacSignature}`,
        'Authorization': authorization,
        'Accept': 'text/json',
        'afdatetimeutc': afDatetimeUtc,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    const clients = data.zoneresponse?.clients || [];
    
    // Get first 2 clients with all their fields for inspection
    const samples = clients.slice(0, 2).map((c: any) => ({
      clientname: c.clientname,
      customfields: c.customfields,
      allKeys: Object.keys(c),
    }));

    return new Response(JSON.stringify({ samples, totalOnPage: clients.length }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
