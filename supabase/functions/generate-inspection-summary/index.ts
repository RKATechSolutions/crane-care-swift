import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { inspectionId } = await req.json();
    if (!inspectionId) throw new Error("inspectionId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: inspection, error: inspErr } = await supabase
      .from("db_inspections")
      .select("*")
      .eq("id", inspectionId)
      .single();
    if (inspErr || !inspection) throw new Error("Inspection not found");

    const { data: responses } = await supabase
      .from("inspection_responses")
      .select("question_id, answer_value, pass_fail_status, severity, comment, defect_flag, urgency, defect_types")
      .eq("inspection_id", inspectionId);

    const questionIds = (responses || []).map(r => r.question_id);
    const { data: questions } = await supabase
      .from("question_library")
      .select("question_id, question_text, section")
      .in("question_id", questionIds);

    // Also get section info from form_template_questions for this inspection's form
    const { data: ftqData } = await supabase
      .from("form_template_questions")
      .select("question_id, section_override")
      .eq("form_id", inspection.form_id)
      .in("question_id", questionIds);

    const questionMap: Record<string, { text: string; section: string }> = {};
    const sectionOverrides: Record<string, string> = {};
    (ftqData || []).forEach(f => { if (f.section_override) sectionOverrides[f.question_id] = f.section_override; });
    (questions || []).forEach(q => {
      questionMap[q.question_id] = { text: q.question_text, section: sectionOverrides[q.question_id] || q.section };
    });

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
      if (r.comment) line += ` — Comment: ${r.comment}`;
      if (r.defect_flag) {
        line += ` [DEFECT - Section: ${section}, Question: ${q.text}${r.urgency ? `, Urgency: ${r.urgency}` : ''}${r.comment ? `, Comment: ${r.comment}` : ''}]`;
        if (r.defect_types && r.defect_types.length > 0) line += ` Categories: ${r.defect_types.join(', ')}`;
        defectCount++;
      }
      sectionData[section].push(line);
      totalAnswered++;
    });

    const sectionSummary = Object.entries(sectionData)
      .map(([section, lines]) => `### ${section}\n${lines.join("\n")}`)
      .join("\n\n");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const prompt = `You are an industrial risk and lifting operations adviser based in Australia.
Use Australian English throughout (e.g. "organisation", "colour", "utilise").
Reference Australian Standards where relevant (AS 2550, AS 1418, AS 4991).

Based on this crane inspection data:

Site: ${inspection.site_name || "Unknown"}
Asset: ${inspection.asset_name || "N/A"}
Date: ${inspection.inspection_date}
Technician: ${inspection.technician_name}
Total Questions Answered: ${totalAnswered}
Defects Found: ${defectCount}

Inspection Responses:
${sectionSummary}

Generate a CONCISE summary for a busy site manager. Short and sweet. No waffle.

## Overall Summary
Write a direct 80-100 word paragraph covering:
- Overall condition of the asset
- Whether it is safe to continue operating
- The most critical concerns (if any)
- Strongest areas

## Defects Found
List each defect using EXACTLY this format: **Section: Question Text** — Urgency Level. Comment: technician comment
Always include the section name, then the question, then the urgency, then the technician's comment if one was provided. Examples:
- **Hoist: Wire Rope** — Schedule Repair Before Next Service. Comment: Visible wear on outer strands
- **Electrical: Emergency Stop** — Urgent Repair Before Next Use. Comment: Button sticking intermittently
- **Structure: End Stops** — Monitor

Keep entire output under 250 words total. Direct, professional tone. No fluff.`;

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an Australian industrial risk and lifting operations adviser generating professional inspection summaries. Always use Australian English spelling and reference Australian Standards. Keep it short and scannable." },
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
