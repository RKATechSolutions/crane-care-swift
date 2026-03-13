const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { clientName, siteName, nextDate, nextTime, technicianName } = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RKA Industrial Solutions <service@reports.rkaindustrialsolutions.com.au>",
        to: ["team@rkaindustrialsolutions.com.au"],
        subject: `✅ Next Inspection Booked — ${clientName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #282027; padding: 24px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #60b34c; margin: 0;">Booking Confirmed</h2>
            </div>
            <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
              <p style="margin: 0 0 16px;">The next inspection has been booked for the following client:</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 40%;">Client</td>
                  <td style="padding: 8px 0; font-weight: bold;">${clientName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Site</td>
                  <td style="padding: 8px 0; font-weight: bold;">${siteName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Next Inspection</td>
                  <td style="padding: 8px 0; font-weight: bold;">${nextDate} at ${nextTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Technician</td>
                  <td style="padding: 8px 0; font-weight: bold;">${technicianName}</td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; color: #999; font-size: 12px;">Sent automatically by RKA Crane Care</p>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-booking-notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
