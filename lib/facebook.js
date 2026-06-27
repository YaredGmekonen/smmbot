// ============================================================
// FACEBOOK HANDLER (ES MODULE)
// Handles Messenger DMs + Page post comments via Graph API & logs
// ============================================================

import { generateReply } from "./ai.js";
import { logChat } from "./db.js";

const GRAPH_API = "https://graph.facebook.com/v19.0";

/**
 * Reply to a Facebook Messenger DM
 */
export async function replyToMessengerDM(pageAccessToken, recipientId, text) {
  const response = await fetch(`${GRAPH_API}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      recipient: { id: recipientId },
      message: { text: text },
      messaging_type: "RESPONSE",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("FB Messenger reply error:", err);
  }

  return response.json();
}

/**
 * Reply to a Facebook post comment
 */
export async function replyToComment(pageAccessToken, commentId, text) {
  const response = await fetch(`${GRAPH_API}/${commentId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: pageAccessToken,
      message: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("FB comment reply error:", err);
  }

  return response.json();
}

/**
 * Main handler for Facebook webhook
 */
export async function handleFacebookWebhook(body, clientConfig) {
  try {
    const { id: clientId, facebook, aiPersona, knowledgeBase, name } = clientConfig;
    const { pageAccessToken } = facebook;

    const entries = body.entry || [];

    for (const entry of entries) {
      // ── Handle Messenger DMs ──
      if (entry.messaging) {
        for (const event of entry.messaging) {
          if (!event.message || event.message.is_echo) continue;

          const senderId = event.sender.id;
          const text = event.message.text || "";

          if (!text.trim()) continue;

          console.log(`[${name}] Facebook DM from ${senderId}: "${text}"`);

          await delay(1000 + Math.random() * 1000);

          const reply = await generateReply(text, aiPersona, knowledgeBase, "Facebook Messenger DM");
          
          // Log to database
          await logChat(clientId, senderId, "Messenger User", "facebook", text, reply);

          if (reply) {
            await replyToMessengerDM(pageAccessToken, senderId, reply);
            console.log(`[${name}] FB DM replied: "${reply}"`);
          }
        }
      }

      // ── Handle Page Post Comments ──
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field !== "feed") continue;

          const value = change.value;
          if (value.item !== "comment") continue;
          if (value.verb !== "add") continue;

          const commentId = value.comment_id;
          const commentText = value.message || "";
          const fromName = value.from?.name || "Someone";

          if (!commentText.trim()) continue;

          console.log(`[${name}] FB comment from ${fromName}: "${commentText}"`);

          await delay(2000 + Math.random() * 3000);

          const reply = await generateReply(commentText, aiPersona, knowledgeBase, "Facebook post comment");
          
          // Log to database
          await logChat(clientId, commentId, `${fromName} (Comment)`, "facebook", commentText, reply);

          if (reply) {
            await replyToComment(pageAccessToken, commentId, reply);
            console.log(`[${name}] FB comment replied: "${reply}"`);
          }
        }
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("handleFacebookWebhook error:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Verify Facebook webhook (GET request challenge)
 */
export function verifyFacebookWebhook(query, verifyToken) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Facebook webhook verified!");
    return { verified: true, challenge };
  }

  return { verified: false };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
