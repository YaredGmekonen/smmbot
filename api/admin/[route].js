// ============================================================
// VERCEL EDGE ROUTE: /api/admin/[route]
// Handles dashboard administrative API requests in Edge Runtime
// ============================================================

import { withSupabase } from "@supabase/server";
import { getAllClientsConfig } from "../../config/clients.js";

export const config = {
  runtime: "edge",
};

export default withSupabase({ auth: "none" }, async (req, ctx) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const action = pathParts[pathParts.length - 1]; // e.g., 'clients', 'chats', 'status', 'register-webhook'

  // Set CORS headers for administration panel
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // ── 1. ACTION: status ──
    if (action === "status" && req.method === "GET") {
      return Response.json({
        ok: true,
        geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
        supabaseConfigured: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY,
        supabaseUrl: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null,
        appUrl: process.env.APP_URL || null,
      }, { headers: corsHeaders });
    }

    // ── 2. ACTION: clients ──
    if (action === "clients") {
      // GET: List all clients
      if (req.method === "GET") {
        let { data: clients, error } = await ctx.supabaseAdmin
          .from("clients")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
        }

        // If empty, trigger auto-seeding
        if (!clients || clients.length === 0) {
          console.log("[Admin API] Database is empty. Seeding default client bots...");
          await getAllClientsConfig();
          
          // Re-fetch seeded data
          const { data: reFetched, error: reError } = await ctx.supabaseAdmin
            .from("clients")
            .select("*")
            .order("created_at", { ascending: true });
          
          if (!reError && reFetched) {
            clients = reFetched;
          }
        }

        return Response.json({ ok: true, clients: clients || [] }, { headers: corsHeaders });
      }

      // POST: Upsert client configuration
      if (req.method === "POST") {
        const payload = await req.json();

        if (!payload.id || !payload.name || !payload.aiPersona) {
          return Response.json({ ok: false, error: "ID, Name, and AI Persona are required." }, { status: 400, headers: corsHeaders });
        }

        const dbClient = {
          id: payload.id,
          name: payload.name,
          telegram_token: payload.telegram?.botToken || null,
          telegram_channel_id: payload.telegram?.channelId || null,
          facebook_page_token: payload.facebook?.pageAccessToken || null,
          facebook_page_id: payload.facebook?.pageId || null,
          facebook_app_secret: payload.facebook?.appSecret || null,
          facebook_verify_token: payload.facebook?.verifyToken || null,
          ai_persona: payload.aiPersona,
          knowledge_base: payload.knowledgeBase || null,
        };

        const { data, error } = await ctx.supabaseAdmin
          .from("clients")
          .upsert(dbClient)
          .select();

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
        }

        return Response.json({ ok: true, client: data?.[0] }, { headers: corsHeaders });
      }

      // DELETE: Remove client configuration
      if (req.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) {
          return Response.json({ ok: false, error: "Client ID is required." }, { status: 400, headers: corsHeaders });
        }

        const { error } = await ctx.supabaseAdmin
          .from("clients")
          .delete()
          .eq("id", id);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
        }

        return Response.json({ ok: true }, { headers: corsHeaders });
      }
    }

    // ── 3. ACTION: chats ──
    if (action === "chats" && req.method === "GET") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) {
        return Response.json({ ok: false, error: "clientId search parameter is required." }, { status: 400, headers: corsHeaders });
      }

      const { data: chats, error } = await ctx.supabaseAdmin
        .from("chats")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
      }

      return Response.json({ ok: true, chats: chats || [] }, { headers: corsHeaders });
    }

    // ── 4. ACTION: register-webhook ──
    if (action === "register-webhook" && req.method === "POST") {
      const id = url.searchParams.get("id");
      if (!id) {
        return Response.json({ ok: false, error: "Client ID is required." }, { status: 400, headers: corsHeaders });
      }

      const { data: client, error } = await ctx.supabaseAdmin
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !client || !client.telegram_token) {
        return Response.json({ ok: false, error: "Client bot token not found." }, { status: 404, headers: corsHeaders });
      }

      // Automatically construct webhook URL based on request origin or env config
      const appUrl = process.env.APP_URL || url.origin;
      const telegramWebhookUrl = `${appUrl}/api/telegram/${id}`;

      console.log(`Setting Telegram webhook for ${id} to: ${telegramWebhookUrl}`);

      const tgApiUrl = `https://api.telegram.org/bot${client.telegram_token}/setWebhook`;
      const tgRes = await fetch(tgApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: telegramWebhookUrl,
          allowed_updates: ["message", "channel_post", "callback_query"],
        }),
      });

      const tgResult = await tgRes.json();

      if (tgRes.ok && tgResult.ok) {
        return Response.json({ ok: true }, { headers: corsHeaders });
      } else {
        return Response.json({ ok: false, error: tgResult.description || "Telegram API rejected registration." }, { status: 400, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Admin API Error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
});
