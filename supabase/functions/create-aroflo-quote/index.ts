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

function formatAuDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
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

interface LineItem {
  category: 'labour' | 'materials' | 'expenses';
  description: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteRequest {
  clientName: string;
  siteName: string;
  siteAddress: string;
  technicianName: string;
  jobDate: string;
  quoteName?: string;
  jobDescription?: string;
  collateItems?: boolean;
  defects?: DefectItem[];
  lineItems?: LineItem[];
}

async function makeArofloRequest(
  method: string,
  body: string,
  uEncoded: string,
  pEncoded: string,
  orgEncoded: string,
  secretKey: string
) {
  const now = new Date();
  const afDatetimeUtc = now.toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
  const authorization = `uencoded=${encodeURIComponent(uEncoded)}&pencoded=${encodeURIComponent(pEncoded)}&orgEncoded=${encodeURIComponent(orgEncoded)}`;
  const accept = 'text/json';
  
  const urlPath = '';
  const payloadString = [method, urlPath, accept, authorization, afDatetimeUtc, body].join('+');
  const hmacSignature = await generateHmacSignature(payloadString, secretKey);

  const response = await fetch('https://api.aroflo.com/', {
    method,
    headers: {
      'Authentication': `HMAC ${hmacSignature}`,
      'Authorization': authorization,
      'Accept': accept,
      'afdatetimeutc': afDatetimeUtc,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const responseText = await response.text();
  console.log(`AroFlo ${method} response (${response.status}): ${responseText.substring(0, 500)}`);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`AroFlo returned non-JSON response: ${responseText.substring(0, 200)}`);
  }

  if (data.status !== '0' && data.status !== 0) {
    throw new Error(`AroFlo API error (status ${data.status}): ${data.statusmessage}`);
  }

  return data;
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

    const requestBody: QuoteRequest = await req.json();
    const {
      clientName,
      siteName,
      siteAddress,
      technicianName,
      jobDate,
      quoteName: customQuoteName,
      jobDescription,
      collateItems,
      defects,
      lineItems,
    } = requestBody;

    // Build quote name
    const auDate = formatAuDate(jobDate);
    const finalQuoteName = customQuoteName || `${clientName} - Repair Quote - ${auDate}`;

    // Build description from job description + defects
    let description = jobDescription?.trim() || `Quote prepared by ${technicianName} for ${siteName} on ${auDate}.`;
    if (defects && defects.length > 0) {
      const defectLines = defects.map((d, i) =>
        `${i + 1}. [${d.severity}] ${d.itemLabel} (${d.craneName}) - ${d.defectType}\n   Timeframe: ${d.rectificationTimeframe}\n   Action: ${d.recommendedAction}\n   ${d.notes ? 'Notes: ' + d.notes : ''}`
      ).join('\n\n');
      description += `\n\nDefects identified:\n${defectLines}`;
    }

    const preparedLineItems = collateItems && lineItems && lineItems.length > 0
      ? [{
          category: 'labour' as const,
          description: lineItems.map(item => item.description?.trim()).filter(Boolean).join('; ') || 'Works as quoted',
          quantity: 1,
          unitPrice: lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0),
        }]
      : lineItems;

    // Step 1: Create the quote
    const quoteXml = `<quotes><quote><quotename><![CDATA[${escapeXml(finalQuoteName)}]]></quotename><client><clientname><![CDATA[${escapeXml(clientName)}]]></clientname></client><description><![CDATA[${escapeXml(description)}]]></description></quote></quotes>`;
    const quoteFormBody = `zone=${encodeURIComponent('quotes')}&postxml=${encodeURIComponent(quoteXml)}`;

    console.log('Creating AroFlo quote:', finalQuoteName);
    const quoteData = await makeArofloRequest('POST', quoteFormBody, uEncoded, pEncoded, orgEncoded, secretKey);

    const inserts = quoteData.zoneresponse?.postresults?.inserts?.quotes || [];
    const quoteId = inserts[0]?.quoteid || null;

    console.log('AroFlo quote created, ID:', quoteId);

    // Step 2: Add line items if provided (via QuoteLineItems zone)
    if (preparedLineItems && preparedLineItems.length > 0 && quoteId) {
      // Rate limit: wait before next request
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Build line items XML - each line item as a quotelineitem
      const lineItemsXml = preparedLineItems.map(item => {
        const lineTotal = (item.quantity * item.unitPrice).toFixed(2);
        return `<quotelineitem><quoteid>${quoteId}</quoteid><description><![CDATA[${escapeXml(item.description)}]]></description><quantity>${item.quantity}</quantity><unitprice>${item.unitPrice.toFixed(2)}</unitprice><linetotal>${lineTotal}</linetotal></quotelineitem>`;
      }).join('');

      const lineItemsFormBody = `zone=${encodeURIComponent('quotelineitems')}&postxml=${encodeURIComponent(`<quotelineitems>${lineItemsXml}</quotelineitems>`)}`;

      try {
        const lineData = await makeArofloRequest('POST', lineItemsFormBody, uEncoded, pEncoded, orgEncoded, secretKey);
        console.log('AroFlo line items added:', lineData.zoneresponse?.postresults?.inserttotal || 0);
      } catch (lineErr) {
        // Line items are a bonus — don't fail the whole quote if they fail
        console.error('Warning: Failed to add line items to AroFlo quote:', lineErr.message);
      }
    }

    const itemCount = preparedLineItems?.length || defects?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        quoteId,
        quoteName: finalQuoteName,
        message: `Draft quote "${finalQuoteName}" created in AroFlo with ${itemCount} item(s)`,
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
