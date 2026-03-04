import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { companyName, siteName, baselineId } = await req.json();

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #228B45; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">RKA Crane Services</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">Pre-Visit Baseline Notification</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; color: #333;">A customer has completed their pre-visit baseline details.</p>
          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Company</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; font-size: 14px;">${companyName || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Site</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; font-size: 14px;">${siteName || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px; color: #666; font-size: 13px;">Baseline ID</td><td style="padding: 8px; font-size: 12px; color: #999;">${baselineId}</td></tr>
          </table>
          <p style="font-size: 14px; color: #333;">The technician can now log in to review the responses, complete the onsite sections, generate the AI summary, and send the final report.</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="font-size: 12px; color: #888;">RKA Crane Services<br/>service@reports.rkaindustrialsolutions.com.au</p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RKA Crane Services <service@reports.rkaindustrialsolutions.com.au>",
        to: ["team@rkaindustrialsolutions.com.au"],
        subject: `Pre-Visit Baseline Completed — ${companyName || siteName || 'Customer'}`,
        html: htmlBody,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", result);
      return new Response(JSON.stringify({ error: result.message || "Failed to send" }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-baseline-complete error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
