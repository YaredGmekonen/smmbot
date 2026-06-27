import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_SECRET_KEY is missing from environment variables!");
}

export const supabaseAdmin = createClient(supabaseUrl || "", supabaseSecretKey || "", {
  auth: {
    persistSession: false,
  },
});

/**
 * Get all client bot configurations
 */
export async function getClients() {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error getting clients:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error getting clients:", err);
    return [];
  }
}

/**
 * Get a specific client configuration by ID
 */
export async function getClient(clientId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error) {
      console.error(`Error getting client ${clientId}:`, error);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`Error getting client ${clientId}:`, err);
    return null;
  }
}

/**
 * Save (insert or update) a client configuration
 */
export async function saveClient(clientId, config) {
  const payload = {
    id: clientId,
    name: config.name,
    telegram_token: config.telegram?.botToken || null,
    telegram_channel_id: config.telegram?.channelId || null,
    facebook_page_token: config.facebook?.pageAccessToken || null,
    facebook_page_id: config.facebook?.pageId || null,
    facebook_app_secret: config.facebook?.appSecret || null,
    facebook_verify_token: config.facebook?.verifyToken || null,
    ai_persona: config.aiPersona,
    knowledge_base: config.knowledgeBase || null,
  };

  const { data, error } = await supabaseAdmin
    .from("clients")
    .upsert(payload)
    .select();

  if (error) {
    console.error("Error saving client:", error);
    throw new Error(error.message);
  }
  return data ? data[0] : null;
}

/**
 * Delete a client configuration
 */
export async function deleteClient(clientId) {
  const { error } = await supabaseAdmin
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (error) {
    console.error("Error deleting client:", error);
    throw new Error(error.message);
  }
  return true;
}

/**
 * Get conversation history logs for a specific client
 */
export async function getChats(clientId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("chats")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(`Error getting chats for ${clientId}:`, error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(`Error getting chats for ${clientId}:`, err);
    return [];
  }
}

/**
 * Log a chat message (user question & bot reply)
 */
export async function logChat(clientId, userId, username, platform, message, response) {
  try {
    const payload = {
      client_id: clientId,
      user_id: String(userId),
      username: username || null,
      platform: platform || "telegram",
      message,
      response,
    };

    const { error } = await supabaseAdmin
      .from("chats")
      .insert(payload);

    if (error) {
      console.error("Error inserting chat log:", error);
    }
  } catch (err) {
    console.error("Error logging chat:", err);
  }
}
