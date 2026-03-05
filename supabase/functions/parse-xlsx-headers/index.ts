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

    const { fileUrl, clientId, siteName } = await req.json();

    // Fetch the file
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch file");
    const text = await response.text();

    // Parse CSV/TSV - try to detect delimiter
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error("File has fewer than 2 lines");

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.replace(/"/g, '').trim());
    
    // Parse data rows
    const dataRows = lines.slice(1).map(line => {
      // Handle quoted CSV fields
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === delimiter[0] && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
        current += char;
      }
      fields.push(current.trim());
      return fields;
    }).filter(row => row.some(cell => cell !== ''));

    // Return headers and first 3 rows for debugging
    return new Response(
      JSON.stringify({ 
        headers, 
        sampleRows: dataRows.slice(0, 5),
        totalRows: dataRows.length 
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
