import { getClients, saveClient } from "../lib/db.js";

// Fallback initial configurations to seed the database if it is empty
const initialClients = {
  geberew: {
    name: "ገበሬው ነጋዴ",
    telegram: {
      botToken: process.env.GEBEREW_TELEGRAM_TOKEN || "",
      channelId: process.env.GEBEREW_TELEGRAM_CHANNEL_ID || "",
    },
    facebook: {
      pageAccessToken: process.env.GEBEREW_FB_PAGE_TOKEN || "",
      pageId: process.env.GEBEREW_FB_PAGE_ID || "",
      appSecret: process.env.GEBEREW_FB_APP_SECRET || "",
      verifyToken: process.env.GEBEREW_FB_VERIFY_TOKEN || "geberew_secret_2024",
    },
    aiPersona: `You are the AI assistant for "ገበሬው ነጋዴ" (Geberew Negade), an Ethiopian teff seller.
You reply in Amharic (or match whatever language the customer uses).
Be friendly, short, and direct. Never be rude. Always end by encouraging them to call or order.

BUSINESS FACTS (use these to answer questions):
- Product: Pure Ada Teff (ጤፍ) from Bishoftu (Debre Zeit)
- Phone: +251 924 946 909
- Telegram: t.me/GeberewNegade
- Location: Bishoftu (Debre Zeit) warehouse

CURRENT PRICES (today's prices — update these when they change):
WHOLESALE (10+ quintals / ኩንታል):
  - ማኛ ጤፍ: 135 ብር/ኪሎ
  - መለስተኛ ነጭ: 130 ብር/ኪሎ
  - ቀይ ጤፍ: 120 ብር/ኪሎ

RETAIL (home buyers / ችርቻሮ):
  - አንደኛ ደረጃ ማኛ: 140 ብር/ኪሎ
  - መለስተኛ ነጭ: 125 ብር/ኪሎ
  - ቀይ ጤፍ: 115 ብር/ኪሎ

100kg = 1 ኩንታል pricing:
  - ማኛ (retail): 14,000 ብር per 100kg
  - ቀይ ጤፍ (retail): 11,500 ብር per 100kg
  - ነጭ (retail): 12,500 ብር per 100kg

SERVICES:
- Free delivery anywhere in Ethiopia (ትራንስፖርት ፍሪ)
- Accurate weight (ትክክለኛ ሚዛን) — no short-changing
- Clean product, no dirt/stones
- Direct from farm, no middlemen

COMMON QUESTIONS & HOW TO ANSWER:
- "ዋጋ?" or "ስንት?" → Give retail price list + say call for bulk deals
- "100 ኪሎ ስንት?" → Give 100kg price for the type they want (or all types if unspecified)
- "ያዳ ማለት ምን ነው?" → Ada is the region, known for the best quality teff in Ethiopia
- "ያደርሳሉ?" or delivery question → Yes, free delivery anywhere Ethiopia
- "ትፈጩታላችሁ?" → We don't grind, we sell whole teff (ሙሉ ጤፍ)
- "ቴሌግራም ላይ ዋጋ የለም" → Prices are posted daily, follow t.me/GeberewNegade
- Greeting only (Hi, ሰላም, 👍, etc) → Greet back warmly and ask how you can help
- Spam/irrelevant comments → Ignore (return null)
- Scam/fraud comments → Ignore (return null)

RULES:
- Always reply in the SAME language the customer used
- Keep replies SHORT (2-4 sentences max)
- Always include phone number for serious buyers
- Never make up prices
- If unsure about something, say "ለበለጠ መረጃ ይደውሉልን: +251 924 946 909"`,
    knowledgeBase: ""
  },
  makiba: {
    name: "MakiBA Digital Era",
    telegram: {
      botToken: process.env.MAKIBA_TELEGRAM_TOKEN || "",
      channelId: process.env.MAKIBA_TELEGRAM_CHANNEL_ID || "",
    },
    facebook: {
      pageAccessToken: process.env.MAKIBA_FB_PAGE_TOKEN || "",
      pageId: process.env.MAKIBA_FB_PAGE_ID || "",
      appSecret: process.env.MAKIBA_FB_APP_SECRET || "",
      verifyToken: process.env.MAKIBA_FB_VERIFY_TOKEN || "makiba_secret_2024",
    },
    aiPersona: `You are the AI assistant for MakiBA Digital Era Services, a digital marketing agency in Addis Ababa, Ethiopia.
Reply professionally in Amharic or English depending on what the customer uses.
Be professional, helpful and concise.

SERVICES: Social media management, content creation, video production, digital marketing strategy.
CONTACT: Via Telegram bot (link in bio)
LOCATION: Addis Ababa, Ethiopia

For pricing and detailed inquiries, always direct to the Telegram bot.
Keep replies to 2-3 sentences.`,
    knowledgeBase: ""
  }
};

/**
 * Get client config details from Supabase.
 * Seeds initial configs if empty.
 */
export async function getClientConfig(clientId) {
  const dbClients = await getClients();
  
  if (dbClients.length === 0) {
    console.log("Database is empty. Seeding initial clients from static configs...");
    for (const [id, config] of Object.entries(initialClients)) {
      try {
        await saveClient(id, config);
      } catch (err) {
        console.error(`Error seeding client ${id}:`, err);
      }
    }
    const reFetched = await getClients();
    const match = reFetched.find(c => c.id === clientId);
    return mapDbClientToConfig(match);
  }

  const match = dbClients.find(c => c.id === clientId);
  return mapDbClientToConfig(match);
}

/**
 * Get all client configurations mapped by client ID.
 */
export async function getAllClientsConfig() {
  const dbClients = await getClients();
  
  if (dbClients.length === 0) {
    console.log("Database is empty. Seeding initial clients from static configs...");
    for (const [id, config] of Object.entries(initialClients)) {
      try {
        await saveClient(id, config);
      } catch (err) {
        console.error(`Error seeding client ${id}:`, err);
      }
    }
    const reFetched = await getClients();
    return reFetched.reduce((acc, c) => {
      acc[c.id] = mapDbClientToConfig(c);
      return acc;
    }, {});
  }

  return dbClients.reduce((acc, c) => {
    acc[c.id] = mapDbClientToConfig(c);
    return acc;
  }, {});
}

/**
 * Helper to map database client to config format used in the bot handlers
 */
function mapDbClientToConfig(dbClient) {
  if (!dbClient) return null;
  return {
    id: dbClient.id,
    name: dbClient.name,
    telegram: {
      botToken: dbClient.telegram_token,
      channelId: dbClient.telegram_channel_id
    },
    facebook: {
      pageAccessToken: dbClient.facebook_page_token,
      pageId: dbClient.facebook_page_id,
      appSecret: dbClient.facebook_app_secret,
      verifyToken: dbClient.facebook_verify_token
    },
    aiPersona: dbClient.ai_persona,
    knowledgeBase: dbClient.knowledge_base
  };
}
