// ============================================================
// VERCEL EDGE ROUTE: /api/telegram/[clientId]
// Receives Telegram webhook updates and runs in Edge Runtime
// ============================================================

import { withSupabase } from "@supabase/server";
import { handleTelegramUpdate } from "../../../lib/telegram.js";

export const config = {
  runtime: "edge",
};

export default withSupabase({ auth: "none" }, async (req, ctx) => {
  // Only accept POST from Telegram
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Parse clientId from URL: /api/telegram/geberew
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const clientId = pathParts[pathParts.length - 1];

  if (!clientId) {
    return new Response("Client ID is required", { status: 400 });
  }

  try {
    // Fetch configuration from Supabase using supabaseAdmin from context
    const { data: dbClient, error } = await ctx.supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error || !dbClient) {
      console.error(`Client not found or query error for: ${clientId}`, error);
      return new Response("Client not found", { status: 404 });
    }

    if (!dbClient.telegram_token) {
      console.error(`No Telegram token configured for client: ${clientId}`);
      return new Response("Bot not configured", { status: 500 });
    }

    // Map to structure expected by handleTelegramUpdate
    const clientConfig = {
      id: dbClient.id,
      name: dbClient.name,
      telegram: {
        botToken: dbClient.telegram_token,
        channelId: dbClient.telegram_channel_id,
      },
      aiPersona: dbClient.ai_persona,
      knowledgeBase: dbClient.knowledge_base,
    };

    const update = await req.json();
    const result = await handleTelegramUpdate(update, clientConfig);
    return Response.json(result);
  } catch (error) {
    console.error("Telegram Edge webhook error:", error);
    // Return 200 OK so Telegram doesn't retry indefinitely
    return Response.json({ ok: true, error: error.message });
  }
});
