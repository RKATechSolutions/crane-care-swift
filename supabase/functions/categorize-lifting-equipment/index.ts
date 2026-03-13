// categorize-lifting-equipment
import { authenticateRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EQUIPMENT_TYPES = [
  "Chain Sling", "Wire Rope Sling", "Web Sling", "Synthetic Sling",
  "Shackle", "Hook", "Lever Hoist", "Chain Block",
  "Beam Clamp", "Spreader Beam", "Lifting Lug", "Eyebolt",
  "Swivel", "Turnbuckle", "Load Binder", "Crane", "Hoist",
  "Rigging Hardware", "Lifting Chain", "Wire Rope",
  "Come Along", "Snatch Block", "Pulley", "Magnet Lifter",
  "Plate Clamp", "Drum Lifter", "Pallet Lifter",
  "Man Cage", "Spreader Bar", "Lifting Beam",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  try {
    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Build a prompt with all items for batch categorization
    const itemList = items.map((item: any, i: number) => {
      const parts = [];
      if (item.notes) parts.push(`Notes: "${item.notes}"`);
      if (item.serial_number) parts.push(`Serial: "${item.serial_number}"`);
      if (item.manufacturer) parts.push(`Manufacturer: "${item.manufacturer}"`);
      if (item.model) parts.push(`Model: "${item.model}"`);
      if (item.wll_value) parts.push(`WLL: ${item.wll_value} ${item.wll_unit || 'kg'}`);
      if (item.grade) parts.push(`Grade: "${item.grade}"`);
      if (item.length_m) parts.push(`Length: ${item.length_m}m`);
      if (item.sling_configuration) parts.push(`Config: "${item.sling_configuration}"`);
      return `Item ${i}: ${parts.join(', ') || 'No details available'}`;
    }).join('\n');

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert in lifting and rigging equipment used in industrial crane maintenance. Your job is to categorize equipment items based on their description, notes, serial numbers, and other metadata.

Available equipment types: ${EQUIPMENT_TYPES.join(', ')}

Rules:
- Use ONLY the equipment types from the list above
- If you cannot determine the type, use "Unknown"
- Base your decision on keywords in the notes, manufacturer, grade, WLL, length, and configuration
- Common patterns: "chain" or grade mentions (e.g. "Grade 80") → Chain Sling or Lifting Chain; "web" or "nylon" → Web Sling; "wire rope" → Wire Rope Sling; "shackle" or "bow" → Shackle; etc.
- If notes mention "sling" without specifying type, look at grade (chain slings have grades like 80, 100) or other clues`,
          },
          {
            role: "user",
            content: `Categorize each of these lifting equipment items. Return ONLY a JSON array of strings (equipment types), one per item, in the same order.\n\n${itemList}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "categorize_items",
              description: "Return equipment type categorizations for each item",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: { type: "string", enum: [...EQUIPMENT_TYPES, "Unknown"] },
                    description: "Equipment type for each item, in order",
                  },
                },
                required: ["categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "categorize_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI categorization failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response from AI");

    const parsed = JSON.parse(toolCall.function.arguments);
    const categories: string[] = parsed.categories || [];

    console.log(`Categorized ${categories.length} items`);

    return new Response(JSON.stringify({ categories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("categorize error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
