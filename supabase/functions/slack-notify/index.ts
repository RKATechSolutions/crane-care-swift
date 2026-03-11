const GATEWAY_URL = 'https://connector-gateway.lovable.dev/slack/api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SlackNotification {
  type: 'job_completed' | 'quote_drafted';
  clientName: string;
  siteName: string;
  technicianName: string;
  defectCount?: number;
  assetsInspected?: number;
  nextInspectionDate?: string;
  quoteTotal?: number;
  lineItemCount?: number;
  quoteName?: string;
  arofloQuoteId?: string;
}

function buildJobCompletedBlocks(data: SlackNotification) {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '✅ Job Completed', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Client:*\n${data.clientName}` },
        { type: 'mrkdwn', text: `*Site:*\n${data.siteName}` },
        { type: 'mrkdwn', text: `*Technician:*\n${data.technicianName}` },
        { type: 'mrkdwn', text: `*Assets Inspected:*\n${data.assetsInspected || 0}` },
      ],
    },
    ...(data.defectCount && data.defectCount > 0
      ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `⚠️ *${data.defectCount} defect${data.defectCount !== 1 ? 's' : ''} found*` },
        }]
      : [{
          type: 'section',
          text: { type: 'mrkdwn', text: '🎉 *No defects found — clean inspection*' },
        }]),
    ...(data.nextInspectionDate
      ? [{
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `📅 Next inspection: ${data.nextInspectionDate}` }],
        }]
      : []),
  ];
}

function buildQuoteDraftedBlocks(data: SlackNotification) {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📝 Draft Quote Created', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Client:*\n${data.clientName}` },
        { type: 'mrkdwn', text: `*Site:*\n${data.siteName}` },
        { type: 'mrkdwn', text: `*Technician:*\n${data.technicianName}` },
        { type: 'mrkdwn', text: `*Line Items:*\n${data.lineItemCount || 0}` },
      ],
    },
    ...(data.quoteTotal != null
      ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `💰 *Total (incl GST):* $${data.quoteTotal.toFixed(2)}` },
        }]
      : []),
    ...(data.arofloQuoteId
      ? [{
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `🔗 AroFlo Quote ID: ${data.arofloQuoteId}` }],
        }]
      : []),
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const SLACK_API_KEY = Deno.env.get('SLACK_API_KEY');
    if (!SLACK_API_KEY) {
      throw new Error('SLACK_API_KEY is not configured');
    }

    const SLACK_JOBS_CHANNEL = Deno.env.get('SLACK_JOBS_CHANNEL') || 'rka-jobs';
    const SLACK_QUOTES_CHANNEL = Deno.env.get('SLACK_QUOTES_CHANNEL') || 'rka-quotes';

    const data: SlackNotification = await req.json();

    const channel = data.type === 'job_completed' ? SLACK_JOBS_CHANNEL : SLACK_QUOTES_CHANNEL;

    const blocks = data.type === 'job_completed'
      ? buildJobCompletedBlocks(data)
      : buildQuoteDraftedBlocks(data);

    const fallbackText = data.type === 'job_completed'
      ? `Job completed: ${data.clientName} — ${data.siteName} by ${data.technicianName}`
      : `Draft quote created: ${data.clientName} — ${data.siteName} ($${data.quoteTotal?.toFixed(2) || '0'})`;

    const response = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': SLACK_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: fallbackText,
        blocks,
        username: 'RKA Jobs',
        icon_emoji: ':wrench:',
      }),
    });

    const slackData = await response.json();

    if (!response.ok || !slackData.ok) {
      throw new Error(`Slack API error [${response.status}]: ${slackData.error || JSON.stringify(slackData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, channel, ts: slackData.ts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Slack notify error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
