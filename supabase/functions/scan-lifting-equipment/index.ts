const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photos, current_equipment_type } = await req.json();
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      throw new Error("At least one photo is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const imageContent = photos.map((photo: string) => ({
      type: "image_url" as const,
      image_url: { url: photo },
    }));

    const contextHint = current_equipment_type
      ? `The technician has already indicated the equipment type might be: "${current_equipment_type}". Use this as a hint but trust what you see in the photos.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert at identifying lifting equipment from photos. Analyse the provided photos of lifting equipment (tag/ID plate, overall item, and optionally a serial/stamp close-up).

${contextHint}

Extract all visible information. For each field, provide a confidence score (0-100) based on how clearly you can read/identify the value. If you see multiple conflicting values for WLL, set wll_conflict to true.

Equipment types to choose from: Chain Sling, Wire Rope Sling, Web Sling, Shackle, Hook, Lever Hoist, Chain Block, Beam Clamp, Spreader Beam, Lifting Lug, Eyebolt, Swivel.

Look carefully at tags, stamps, embossed text, and any markings on the equipment.`,
              },
              ...imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lifting_equipment",
              description: "Extract structured data from lifting equipment photos",
              parameters: {
                type: "object",
                properties: {
                  equipment_type: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                      evidence_snippet: { type: "string" },
                    },
                    required: ["value", "confidence"],
                  },
                  manufacturer: {
                    type: "object",
                    properties: {
                      value: { type: "string", nullable: true },
                      confidence: { type: "number" },
                      evidence_snippet: { type: "string" },
                    },
                    required: ["value", "confidence"],
                  },
                  model: {
                    type: "object",
                    properties: {
                      value: { type: "string", nullable: true },
                      confidence: { type: "number" },
                      evidence_snippet: { type: "string" },
                    },
                    required: ["value", "confidence"],
                  },
                  serial_number: {
                    type: "object",
                    properties: {
                      value: { type: "string", nullable: true },
                      confidence: { type: "number" },
                      evidence_snippet: { type: "string" },
                    },
                    required: ["value", "confidence"],
                  },
                  asset_tag: {
                    type: "object",
                    properties: {
                      value: { type: "string", nullable: true },
                      confidence: { type: "number" },
                      evidence_snippet: { type: "string" },
                    },
                    required: ["value", "confidence"],
                  },
                  wll_value: {
                    type: "object",
                    properties: {
                      value: { type: "number", nullable: true },
                      confidence: { type: "number" },
                      evidence_snippet: { type: "string" },
                    },
                    required: ["value", "confidence"],
                  },
                  wll_unit: {
                    type: "object",
                    properties: {
                      value: { type: "string", enum: ["kg", "t"] },
                      confidence: { type: "number" },
                    },
                    required: ["value", "confidence"],
                  },
                  length_m: {
                    type: "object",
                    properties: {
                      value: { type: "number", nullable: true },
                      confidence: { type: "number" },
                    },
                    required: ["value", "confidence"],
                  },
                  grade: {
                    type: "object",
                    properties: {
                      value: { type: "string", nullable: true },
                      confidence: { type: "number" },
                    },
                    required: ["value", "confidence"],
                  },
                  tag_present: {
                    type: "object",
                    properties: {
                      value: { type: "string", enum: ["true", "false", "unknown", "illegible"] },
                      confidence: { type: "number" },
                    },
                    required: ["value", "confidence"],
                  },
                  wll_conflict: { type: "boolean" },
                  notes: { type: "string", nullable: true },
                  overall_confidence: { type: "number" },
                },
                required: [
                  "equipment_type", "manufacturer", "model", "serial_number",
                  "asset_tag", "wll_value", "wll_unit", "tag_present",
                  "wll_conflict", "overall_confidence",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_lifting_equipment" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    let result;
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool call:", toolCall.function.arguments);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-lifting-equipment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
