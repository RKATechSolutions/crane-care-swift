import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

    // ── New accountability / financial metrics (mirror the form's calc) ──
    const b: any = baseline;
    const opHoursPerYear = (b.operating_hours_per_day || 0) * (b.days_per_week || 0) * 52;
    const mtbf = breakdowns > 0 && opHoursPerYear > 0 ? opHoursPerYear / breakdowns : 0;
    const availability = opHoursPerYear > 0 ? Math.max(0, (opHoursPerYear - annualDowntime) / opHoursPerYear) * 100 : 0;
    const preventable = b.preventable_breakdowns || 0;
    const preventabilityIndex = breakdowns > 0 ? (preventable / breakdowns) * 100 : 0;
    const adoptionRate = b.repairs_approved_per_10 != null ? (b.repairs_approved_per_10 / 10) * 100 : 0;
    const deferredRisk = b.declined_work_value || 0;
    const labourCost = b.labour_cost_per_hour || 0;
    const idleHeadcount = b.idle_headcount_during_downtime || 0;
    const overtimeHours = b.overtime_hours_downtime || 0;
    const trueAnnualCost = annualDowntime * (revHour + idleHeadcount * labourCost) + overtimeHours * labourCost;

    const MATURITY_FIELDS = [
      'cleanliness_standard', 'workshop_tidy', 'environmental_factors', 'crane_hazards_meetings',
      'breakdown_response_process', 'preventative_maintenance', 'pre_start_inspections', 'logbooks_updated', 'findings_reviewed', 'defects_tracked',
      'walkways_clear', 'signage_current', 'ppe_worn', 'within_capacity', 'lifting_register_maintained', 'load_handling_education', 'complex_lifts_process',
      'competency_matrix', 'supervisors_trained', 'near_misses_recorded', 'near_misses_reviewed',
      'design_work_period', 'remaining_service_life', 'digital_monitoring', 'capital_forecast', 'duty_classification_reassessed',
      'reports_electronic', 'reports_risk_ranking', 'engineering_advice', 'lifecycle_planning',
      'decision_maker_reachable', 'critical_spares_onsite',
    ];
    const scoreAnswer = (v: string): number => {
      const lower = (v || '').toLowerCase();
      if (lower === 'yes') return 2;
      if (lower === 'partially' || lower === 'somewhat') return 1;
      if (lower === 'no') return 0;
      return -1;
    };
    let mPts = 0, mMax = 0;
    MATURITY_FIELDS.forEach((k) => { const s = scoreAnswer(b[k]); if (s >= 0) { mPts += s; mMax += 2; } });
    const maturityScore = mMax > 0 ? (mPts / mMax) * 100 : 0;

    const respParts: number[] = [];
    if (b.repairs_approved_per_10 != null) respParts.push(adoptionRate);
    if (b.quote_approval_lag != null) respParts.push(Math.max(0, 100 - (b.quote_approval_lag / 30) * 100));
    if (b.decision_maker_reachable) respParts.push(scoreAnswer(b.decision_maker_reachable) / 2 * 100);
    const responsivenessScore = respParts.length ? respParts.reduce((a, c) => a + c, 0) / respParts.length : 0;

    // ── Inspection findings (last 12 months) by crane ──
    let defectText = 'None on file';
    try {
      const { data: defectRows } = await supabase
        .from('v_crane_defect_summary')
        .select('crane, fails, immediate, urgent, scheduled, monitor')
        .eq('site_name', baseline.site_name);
      if (defectRows && defectRows.length) {
        const byCrane: Record<string, { fails: number; urgent: number; scheduled: number; monitor: number }> = {};
        defectRows.forEach((r: any) => {
          const k = r.crane || 'Unknown';
          if (!byCrane[k]) byCrane[k] = { fails: 0, urgent: 0, scheduled: 0, monitor: 0 };
          byCrane[k].fails += r.fails || 0;
          byCrane[k].urgent += (r.immediate || 0) + (r.urgent || 0);
          byCrane[k].scheduled += r.scheduled || 0;
          byCrane[k].monitor += r.monitor || 0;
        });
        defectText = Object.entries(byCrane)
          .map(([c, v]) => `${c}: ${v.fails} fail(s), ${v.urgent} urgent, ${v.scheduled} scheduled, ${v.monitor} monitor`)
          .join('; ');
      }
    } catch (_) { /* findings optional */ }

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
RKA's motto is "fix the system, not just the crane" — reflect that throughout.

Based on this Crane Culture & Performance Baseline assessment:

Company: ${baseline.company_name || baseline.site_name}
Site: ${baseline.site_location || 'Not specified'}
Number of Cranes: ${baseline.number_of_cranes || 'Not specified'}
Operating Hours/Day: ${baseline.operating_hours_per_day || 'N/A'}
Production Increased: ${baseline.production_increased || 'N/A'}

HEADLINE SCORES:
- System Maturity Score: ${maturityScore.toFixed(0)}/100 (overall systems health, higher is better)
- Responsiveness Score: ${responsivenessScore.toFixed(0)}/100 (how fast recommended work is approved & actioned)
- Crane Availability: ${availability.toFixed(1)}%
- Preventability Index: ${preventabilityIndex.toFixed(0)}% (share of breakdowns flagged beforehand but not actioned)

PERFORMANCE DATA (last 12 months):
- Breakdowns: ${breakdowns}
- Avg Downtime per Breakdown: ${avgDowntime} hrs
- Annual Downtime: ${annualDowntime.toFixed(1)} hrs
- Mean Time Between Failures: ${mtbf.toFixed(0)} hrs
- Reactive Maintenance Ratio: ${reactiveRatio.toFixed(1)}%
- Mean Time To Repair: ${mttr.toFixed(1)} hrs
- First-Time Fix Rate: ${baseline.first_time_fix || 'N/A'}%

FINANCIAL IMPACT:
- Revenue/Hour: $${revHour}
- Cost Per Breakdown: $${costPerBreakdown.toFixed(0)}
- Annual Downtime Cost: $${annualCost.toFixed(0)}
- True Annual Cost of Downtime (incl. idle labour & overtime): $${trueAnnualCost.toFixed(0)}
${baseline.backup_crane === 'No' ? `- Adjusted Cost (No Backup): $${adjustedCost.toFixed(0)}` : ''}

ACCOUNTABILITY & RESPONSIVENESS (customer-side levers):
- Advice Adoption Rate: ${adoptionRate.toFixed(0)}% of recommended repairs approved
- Average Quote-to-Approval Lag: ${baseline.quote_approval_lag != null ? baseline.quote_approval_lag + ' days' : 'N/A'}
- Deferred Risk Exposure (recommended work not yet approved): $${deferredRisk.toFixed(0)}
- Customer self-rates approvals as prompt: ${baseline.acts_on_recommendations || 'N/A'}
- Decision-maker reachable on-site for sign-off: ${baseline.decision_maker_reachable || 'N/A'}

INSPECTION FINDINGS BY CRANE (last 12 months): ${defectText}

KEY RECURRING ISSUES: ${baseline.top_recurring_issues || 'None specified'}

CULTURE & COMPLIANCE RESPONSES:
${selectFields}

PROVIDER FEEDBACK:
- Most valued: ${baseline.value_most || 'Not answered'}
- Most frustrating: ${baseline.most_frustrating || 'Not answered'}
- Magic wand: ${baseline.magic_wand || 'Not answered'}

Generate a strategic executive summary for a busy site/operations manager. Keep it scannable.

1. Executive Summary — MAX 120 words. State overall crane culture maturity, biggest risks, strongest areas, and — where the data shows it — whether outcomes are constrained by the equipment itself or by how quickly recommended work is approved.

2. Top 3 Strategic Risks — One line each, ranked by business impact. Name specific cranes or findings where the inspection data allows.

3. Accountability Insight — 2-3 sentences. Using Advice Adoption, Quote-to-Approval Lag and Deferred Risk Exposure, state plainly whether deferred or slow-approved work is holding back results, and quantify the deferred exposure in dollars. Be factual and constructive, never blaming. If the customer self-rates approvals as prompt but the adoption rate is low, note that gap neutrally.

4. Financial Impact Summary — 2-3 sentences on the true cost of the current approach.

5. Prioritised Recommendations — Numbered, ranked by impact. For each: state the issue, a specific RKA solution (e.g. scheduled preventative maintenance, digital monitoring, operator competency/refresher training, a Design Work Period assessment per AS 2550), and the estimated benefit (downtime, cost, compliance).

6. 12-Month Improvement Roadmap — Bullets, max 3 per phase: NOW (0–3 months), NEXT (3–6 months), LATER (6–12 months).

7. Culture Score Assessment — Rate maturity as Reactive / Developing / Proactive / Leading, with one sentence why.

Use direct, professional tone. No fluff, no sales language. Keep entire output under 750 words total.`;

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
