import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { inspectionId } = await req.json();
    if (!inspectionId) throw new Error("inspectionId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get inspection
    const { data: inspection, error: inspErr } = await supabase
      .from("db_inspections")
      .select("*")
      .eq("id", inspectionId)
      .single();
    if (inspErr || !inspection) throw new Error("Inspection not found");

    // Get responses with question text
    const { data: responses } = await supabase
      .from("inspection_responses")
      .select("question_id, answer_value, pass_fail_status, severity, comment, defect_flag, urgency")
      .eq("inspection_id", inspectionId);

    // Get question texts
    const questionIds = (responses || []).map(r => r.question_id);
    const { data: questions } = await supabase
      .from("question_library")
      .select("question_id, question_text, section")
      .in("question_id", questionIds);

    const questionMap: Record<string, { text: string; section: string }> = {};
    (questions || []).forEach(q => {
      questionMap[q.question_id] = { text: q.question_text, section: q.section };
    });

    // Build response summary grouped by section
    const sectionData: Record<string, string[]> = {};
    let defectCount = 0;
    let totalAnswered = 0;

    (responses || []).forEach(r => {
      const q = questionMap[r.question_id];
      if (!q) return;
      const section = q.section || "General";
      if (!sectionData[section]) sectionData[section] = [];

      const answer = r.answer_value || r.pass_fail_status || "No answer";
      let line = `- ${q.text}: ${answer}`;
      if (r.severity) line += ` (Severity: ${r.severity})`;
      if (r.comment) line += ` — Note: ${r.comment}`;
      if (r.defect_flag) {
        line += " [DEFECT]";
        defectCount++;
      }
      sectionData[section].push(line);
      totalAnswered++;
    });

    const sectionSummary = Object.entries(sectionData)
      .map(([section, lines]) => `### ${section}\n${lines.join("\n")}`)
      .join("\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an industrial risk and lifting operations adviser based in Australia.
Use Australian English throughout (e.g. "organisation", "colour", "utilise").
Reference Australian Standards where relevant (AS 2550, AS 1418, AS 4991).

Based on this initial site inspection data:

Site: ${inspection.site_name || "Unknown"}
Asset: ${inspection.asset_name || "N/A"}
Date: ${inspection.inspection_date}
Technician: ${inspection.technician_name}
Total Questions Answered: ${totalAnswered}
Defects Found: ${defectCount}

Inspection Responses:
${sectionSummary}

Generate a CONCISE executive summary for a busy site manager. Keep it scannable with bullet points. No waffle.

1. Executive Summary — MAX 100 words. State overall risk level, biggest concerns, and strongest areas.

2. Top 3 Risks — One line each, ranked by urgency.

3. 12-Month Action Plan — Bullet points only, max 3 items per phase:
   - NOW (0–3 months) — most critical
   - NEXT (3–6 months)
   - LATER (6–12 months)

Use direct, professional tone. No fluff, no sales language. Keep entire output under 400 words total.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an Australian industrial risk and lifting operations adviser generating professional inspection reports. Always use Australian English spelling and reference Australian Standards." },
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
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    // Save summary to inspection
    await supabase.from("db_inspections").update({
      ai_summary: summary,
      updated_at: new Date().toISOString(),
    }).eq("id", inspectionId);

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
