import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-slack-signature, x-slack-request-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function verifySlackSignature(signingSecret: string, timestamp: string, body: string, signature: string): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac('sha256', signingSecret).update(baseString).digest('hex');
  const computed = `v0=${hmac}`;
  // Constant-time comparison
  if (computed.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SLACK_SIGNING_SECRET = Deno.env.get('SLACK_SIGNING_SECRET');
  if (!SLACK_SIGNING_SECRET) {
    return new Response(JSON.stringify({ error: 'SLACK_SIGNING_SECRET not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.text();
  const timestamp = req.headers.get('x-slack-request-timestamp') || '';
  const signature = req.headers.get('x-slack-signature') || '';

  // Verify request is from Slack
  if (!verifySlackSignature(SLACK_SIGNING_SECRET, timestamp, body, signature)) {
    console.error('Invalid Slack signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const event = JSON.parse(body);

  // Handle Slack URL verification challenge
  if (event.type === 'url_verification') {
    return new Response(JSON.stringify({ challenge: event.challenge }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle events
  if (event.type === 'event_callback') {
    const slackEvent = event.event;
    console.log('Received Slack event:', slackEvent.type, JSON.stringify(slackEvent).substring(0, 200));

    // Handle message replies in threads (e.g. admin replying to a job notification)
    if (slackEvent.type === 'message' && slackEvent.thread_ts && !slackEvent.bot_id) {
      console.log(`Thread reply from ${slackEvent.user} in channel ${slackEvent.channel}: ${slackEvent.text}`);
      // Future: store thread replies, notify technician, etc.
    }

    // Handle reactions (e.g. admin acknowledging a notification)
    if (slackEvent.type === 'reaction_added') {
      console.log(`Reaction ${slackEvent.reaction} added by ${slackEvent.user} on message ${slackEvent.item?.ts}`);
      // Future: mark as acknowledged, update status, etc.
    }
  }

  // Acknowledge receipt immediately
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
