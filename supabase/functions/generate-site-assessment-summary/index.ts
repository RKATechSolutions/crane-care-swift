import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assessmentId } = await req.json();
    if (!assessmentId) throw new Error("assessmentId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: assessment, error } = await supabase
      .from("site_assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (error || !assessment) throw new Error("Assessment not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const facetNames: Record<string, string> = {
      facet1: "Asset Lifecycle",
      facet2: "Inspection & Compliance",
      facet3: "Maintenance & Breakdown",
      facet4: "Safety & Load Control",
      facet5: "People & Competency",
      facet6: "Environment & Conditions",
      facet7: "Governance & Improvement",
    };

    const prompt = `You are an industrial risk and lifting operations advisor.

Based on the structured 7-Facet lifting assessment data below:

Facet Scores:
Asset Lifecycle: ${assessment.facet1_score}
Inspection & Compliance: ${assessment.facet2_score}
Maintenance & Breakdown: ${assessment.facet3_score}
Safety & Load Control: ${assessment.facet4_score}
People & Competency: ${assessment.facet5_score}
Environment & Conditions: ${assessment.facet6_score}
Governance & Improvement: ${assessment.facet7_score}

Total Score: ${assessment.total_score}
Not Yet Implemented Count: ${assessment.count_not_yet}
Partially Implemented Count: ${assessment.count_partial}
Highest Risk Facet: ${assessment.highest_risk_facet}
Strongest Facet: ${assessment.strongest_facet}

Site: ${assessment.site_name}
Assessment Type: ${assessment.assessment_type}

Generate:

1. A professional executive summary (300–400 words) suitable for senior management.

2. Identify top 3 operational risks in priority order.

3. Identify strongest operational area.

4. Provide a prioritised 12-month improvement plan divided into:
   - Immediate (0–3 months)
   - Medium Term (3–6 months)
   - Strategic (6–12 months)

Use advisory, professional tone.
Do not sound sales-focused.
Be practical and realistic.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an industrial risk and lifting operations advisor generating professional assessment reports." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
