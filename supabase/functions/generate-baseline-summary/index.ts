import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { baselineId } = await req.json();
    if (!baselineId) throw new Error("baselineId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: baseline, error } = await supabase
      .from("crane_baselines")
      .select("*")
      .eq("id", baselineId)
      .single();
    if (error || !baseline) throw new Error("Baseline not found");

    // Build data summary
    const breakdowns = baseline.breakdowns || 0;
    const avgDowntime = baseline.avg_downtime || 0;
    const emergencyVisits = baseline.emergency_visits || 0;
    const scheduledVisits = baseline.scheduled_visits || 0;
    const revHour = baseline.rev_hour || 0;
    const totalOps = baseline.total_operators || 0;
    const refresherOps = baseline.refresher_operators || 0;

    const annualDowntime = breakdowns * avgDowntime;
    const reactiveRatio = (emergencyVisits + scheduledVisits) > 0
      ? (emergencyVisits / (emergencyVisits + scheduledVisits)) * 100 : 0;
    const mttr = breakdowns > 0 ? annualDowntime / breakdowns : 0;
    const costPerBreakdown = revHour * avgDowntime;
    const annualCost = costPerBreakdown * breakdowns;
    const adjustedCost = baseline.backup_crane === 'No' ? annualCost * 1.2 : annualCost;
    const trainingCoverage = totalOps > 0 ? (refresherOps / totalOps) * 100 : 0;

    const selectFields = [
      ['Cleanliness standard', baseline.cleanliness_standard],
      ['Workshop tidy', baseline.workshop_tidy],
      ['Environmental factors', baseline.environmental_factors],
      ['Crane hazards in meetings', baseline.crane_hazards_meetings],
      ['Breakdown response process', baseline.breakdown_response_process],
      ['Preventative maintenance', baseline.preventative_maintenance],
      ['Pre-start inspections', baseline.pre_start_inspections],
      ['Logbooks updated', baseline.logbooks_updated],
      ['Findings reviewed', baseline.findings_reviewed],
      ['Defects tracked', baseline.defects_tracked],
      ['Walkways clear', baseline.walkways_clear],
      ['Signage current', baseline.signage_current],
      ['PPE worn', baseline.ppe_worn],
      ['Within capacity', baseline.within_capacity],
      ['Lifting register maintained', baseline.lifting_register_maintained],
      ['Load handling education', baseline.load_handling_education],
      ['Complex lifts process', baseline.complex_lifts_process],
      ['Competency matrix', baseline.competency_matrix],
      ['Supervisors trained', baseline.supervisors_trained],
      ['Near misses recorded', baseline.near_misses_recorded],
      ['Near misses reviewed', baseline.near_misses_reviewed],
      ['Design work period', baseline.design_work_period],
      ['Remaining service life', baseline.remaining_service_life],
      ['Digital monitoring', baseline.digital_monitoring],
      ['Capital forecast', baseline.capital_forecast],
      ['Duty classification reassessed', baseline.duty_classification_reassessed],
      ['Reports electronic', baseline.reports_electronic],
      ['Reports risk ranking', baseline.reports_risk_ranking],
      ['Engineering advice', baseline.engineering_advice],
      ['Lifecycle planning', baseline.lifecycle_planning],
    ].filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join('\n');

    const prompt = `You are an Australian industrial crane and lifting operations strategic adviser.
Use Australian English throughout. Reference Australian Standards where relevant (AS 2550, AS 1418, AS 4991).

Based on this Crane Culture & Performance Baseline assessment:

Company: ${baseline.company_name || baseline.site_name}
Site: ${baseline.site_location || 'Not specified'}
Number of Cranes: ${baseline.number_of_cranes || 'Not specified'}
Operating Hours/Day: ${baseline.operating_hours_per_day || 'N/A'}
Production Increased: ${baseline.production_increased || 'N/A'}

PERFORMANCE DATA:
- Breakdowns (12 months): ${breakdowns}
- Avg Downtime per Breakdown: ${avgDowntime} hrs
- Longest Downtime: ${baseline.longest_downtime || 'N/A'} hrs
- Annual Downtime: ${annualDowntime.toFixed(1)} hrs
- Reactive Maintenance Ratio: ${reactiveRatio.toFixed(1)}%
- Mean Time To Repair: ${mttr.toFixed(1)} hrs
- First-Time Fix Rate: ${baseline.first_time_fix || 'N/A'}%
- Revenue/Hour: $${revHour}
- Cost Per Breakdown: $${costPerBreakdown.toFixed(0)}
- Annual Downtime Cost: $${annualCost.toFixed(0)}
${baseline.backup_crane === 'No' ? `- Adjusted Cost (No Backup): $${adjustedCost.toFixed(0)}` : ''}
- Training Coverage: ${trainingCoverage.toFixed(1)}%
- Top Recurring Issues: ${baseline.top_recurring_issues || 'None specified'}

CULTURE & COMPLIANCE RESPONSES:
${selectFields}

PROVIDER FEEDBACK:
- Most valued: ${baseline.value_most || 'Not answered'}
- Most frustrating: ${baseline.most_frustrating || 'Not answered'}
- Magic wand: ${baseline.magic_wand || 'Not answered'}

Generate a strategic executive summary for a busy site/operations manager. Keep it scannable.

1. Executive Summary — MAX 120 words. State overall crane culture maturity level, biggest risks, and strongest areas.

2. Top 3 Strategic Risks — One line each, ranked by business impact.

3. Financial Impact Summary — 2-3 sentences on the cost of current crane management approach.

4. Prioritised Recommendations — Numbered list, ranked by impact. For each recommendation:
   - State the issue clearly
   - Provide a specific RKA solution (e.g., "RKA can implement a scheduled preventative maintenance program", "RKA's digital monitoring package can track real-time crane health", "RKA can conduct operator competency assessments and refresher training", "RKA's engineering team can perform a Design Work Period assessment per AS 2550")
   - Estimate the benefit (cost savings, downtime reduction, compliance improvement)

5. 12-Month Improvement Roadmap — Bullet points only, max 3 items per phase:
   - NOW (0–3 months) — most critical
   - NEXT (3–6 months)
   - LATER (6–12 months)

6. Culture Score Assessment — Rate the overall crane culture maturity as: Reactive / Developing / Proactive / Leading. Explain in one sentence.

Use direct, professional tone. No fluff, no sales language. Keep entire output under 700 words total.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an Australian industrial crane and lifting operations strategic adviser generating professional baseline assessment reports. Always use Australian English spelling and reference Australian Standards." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    await supabase.from("crane_baselines").update({
      ai_summary: summary,
      updated_at: new Date().toISOString(),
    }).eq("id", baselineId);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
