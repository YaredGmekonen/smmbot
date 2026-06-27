// ============================================================
// TELEGRAM HANDLER (ES MODULE)
// Receives updates from Telegram, generates AI reply, sends back & logs
// ============================================================

import { generateReply } from "./ai.js";
import { logChat } from "./db.js";

const TELEGRAM_API = "https://api.telegram.org/bot";

/**
 * Send a message or reply via Telegram
 */
export async function sendTelegramMessage(botToken, chatId, text, replyToMessageId = null) {
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
  };

  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }

  const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Telegram send error:", err);
  }

  return response.json();
}

/**
 * Main handler for Telegram webhook updates
 */
export async function handleTelegramUpdate(update, clientConfig) {
  try {
    const { id: clientId, telegram, aiPersona, knowledgeBase, name } = clientConfig;
    const botToken = telegram.botToken;

    // ── Handle Direct Messages (private chats) ──
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text || msg.caption || "";
      const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'

      // Skip empty messages
      if (!text.trim()) return { ok: true };

      const senderName = msg.from?.username 
        ? `@${msg.from.username}` 
        : `${msg.from?.first_name || ""} ${msg.from?.last_name || ""}`.trim() || "User";

      // For private DMs → always reply
      if (chatType === "private") {
        console.log(`[${name}] Telegram DM from ${senderName}: "${text}"`);

        const reply = await generateReply(text, aiPersona, knowledgeBase, "Telegram DM");
        
        // Log to database
        await logChat(clientId, chatId, senderName, "telegram", text, reply);

        if (reply) {
          await sendTelegramMessage(botToken, chatId, reply, msg.message_id);
          console.log(`[${name}] Replied: "${reply}"`);
        }
      }

      // For group/channel messages → reply to comments/questions
      if (chatType === "group" || chatType === "supergroup") {
        console.log(`[${name}] Telegram group msg: "${text}"`);

        const reply = await generateReply(text, aiPersona, knowledgeBase, "Telegram group comment");
        
        // Log to database
        await logChat(clientId, chatId, senderName, "telegram", text, reply);

        if (reply) {
          await sendTelegramMessage(botToken, chatId, reply, msg.message_id);
        }
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("handleTelegramUpdate error:", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Register webhook with Telegram
 */
export async function registerTelegramWebhook(botToken, webhookUrl) {
  const response = await fetch(`${TELEGRAM_API}${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "channel_post", "callback_query"],
    }),
  });

  return response.json();
}
