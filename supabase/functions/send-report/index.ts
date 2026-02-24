import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { to, clientName, siteName, pdfBase64, filename } = await req.json();

    if (!to || !pdfBase64 || !filename) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, pdfBase64, filename" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #228B45; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">RKA Crane Services</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">Crane Inspection &amp; Maintenance</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; color: #333;">Hi ${clientName || "there"},</p>
          <p style="font-size: 15px; color: #333; line-height: 1.6;">
            Please find attached the service report for <strong>${siteName || "your site"}</strong>.
          </p>
          <p style="font-size: 15px; color: #333; line-height: 1.6;">
            This report includes the full inspection results, any defects found, recommendations, 
            and your next scheduled service date.
          </p>
          <p style="font-size: 15px; color: #333; line-height: 1.6;">
            If you have any questions about this report or would like to discuss any items further, 
            please don't hesitate to contact us.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="font-size: 12px; color: #888;">
            RKA Crane Services<br/>
            service@reports.rkaindustrialsolutions.com.au
          </p>
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
        to: Array.isArray(to) ? to : [to],
        subject: `Service Report — ${siteName || "Crane Inspection"}`,
        html: htmlBody,
        attachments: [
          {
            filename,
            content: pdfBase64,
            type: "application/pdf",
          },
        ],
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", result);
      return new Response(
        JSON.stringify({ error: result.message || "Failed to send email", details: result }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
