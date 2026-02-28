import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find unsent quotes older than 24 hours that haven't had a reminder sent
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: overdueQuotes, error } = await supabase
      .from("quotes")
      .select("id, technician_name, client_name, asset_name, total, created_at, quote_number")
      .eq("status", "not_sent")
      .eq("reminder_sent", false)
      .lt("created_at", cutoff);

    if (error) throw error;
    if (!overdueQuotes || overdueQuotes.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue quotes found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by technician for a single email per tech
    const byTech: Record<string, typeof overdueQuotes> = {};
    for (const q of overdueQuotes) {
      const name = q.technician_name || "Technician";
      if (!byTech[name]) byTech[name] = [];
      byTech[name].push(q);
    }

    const results: string[] = [];

    for (const [techName, quotes] of Object.entries(byTech)) {
      const quoteList = quotes
        .map(
          (q) =>
            `• ${q.client_name}${q.asset_name ? ` — ${q.asset_name}` : ""} ($${Number(q.total).toFixed(2)}) — created ${new Date(q.created_at).toLocaleDateString()}`
        )
        .join("\n");

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a1a; padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #ffffff; margin: 0;">⚠️ Quote Reminder</h2>
          </div>
          <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e5e5;">
            <p>Hi ${techName.split(" ")[0]},</p>
            <p>You have <strong>${quotes.length} unsent quote${quotes.length > 1 ? "s" : ""}</strong> that ${quotes.length > 1 ? "are" : "is"} older than 24 hours:</p>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <pre style="margin: 0; white-space: pre-wrap; font-size: 14px;">${quoteList}</pre>
            </div>
            <p>Please send these quotes to the client as soon as possible.</p>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">— RKA Industrial Solutions</p>
          </div>
        </div>
      `;

      // Send via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "RKA Reminders <service@reports.rkaindustrialsolutions.com.au>",
          to: ["admin@rkaindustrialsolutions.com.au"],
          subject: `⚠️ ${quotes.length} Unsent Quote${quotes.length > 1 ? "s" : ""} — ${techName}`,
          html,
        }),
      });

      if (emailRes.ok) {
        // Mark reminders as sent
        const ids = quotes.map((q) => q.id);
        await supabase
          .from("quotes")
          .update({ reminder_sent: true })
          .in("id", ids);
        results.push(`Sent reminder for ${techName} (${quotes.length} quotes)`);
      } else {
        const errText = await emailRes.text();
        results.push(`Failed for ${techName}: ${errText}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
