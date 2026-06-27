// ============================================================
// VERCEL EDGE ROUTE: /api/facebook/[clientId]
// Handles Facebook verification and webhook events in Edge Runtime
// ============================================================

import { withSupabase } from "@supabase/server";
import { handleFacebookWebhook, verifyFacebookWebhook } from "../../lib/facebook.js";

export const config = {
  runtime: "edge",
};

export default withSupabase({ auth: "none" }, async (req, ctx) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const clientId = pathParts[pathParts.length - 1];

  if (!clientId) {
    return new Response("Client ID is required", { status: 400 });
  }

  try {
    // Fetch configuration from Supabase
    const { data: dbClient, error } = await ctx.supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error || !dbClient) {
      console.error(`Client not found or query error for: ${clientId}`, error);
      return new Response("Client not found", { status: 404 });
    }

    const clientConfig = {
      id: dbClient.id,
      name: dbClient.name,
      facebook: {
        pageAccessToken: dbClient.facebook_page_token,
        pageId: dbClient.facebook_page_id,
        appSecret: dbClient.facebook_app_secret,
        verifyToken: dbClient.facebook_verify_token,
      },
      aiPersona: dbClient.ai_persona,
      knowledgeBase: dbClient.knowledge_base,
    };

    // ── GET: Facebook webhook verification challenge ──
    if (req.method === "GET") {
      const query = Object.fromEntries(url.searchParams.entries());
      const { verified, challenge } = verifyFacebookWebhook(
        query,
        clientConfig.facebook.verifyToken
      );

      if (verified) {
        return new Response(challenge, { status: 200 });
      } else {
        return Response.json({ error: "Verification failed" }, { status: 403 });
      }
    }

    // ── POST: Incoming events (DMs, comments) ──
    if (req.method === "POST") {
      const body = await req.json();

      // Process event in background so we can respond 200 OK immediately to Facebook
      if (ctx.waitUntil) {
        ctx.waitUntil(
          handleFacebookWebhook(body, clientConfig).catch((err) =>
            console.error("Facebook background processing error:", err)
          )
        );
      } else {
        // Fallback for development servers without waitUntil support
        await handleFacebookWebhook(body, clientConfig);
      }

      return Response.json({ received: true });
    }
  } catch (error) {
    console.error("Facebook Edge Webhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response("Method not allowed", { status: 405 });
});
