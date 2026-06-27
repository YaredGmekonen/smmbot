// ============================================================
// SETUP SCRIPT (ES MODULE)
// Run this ONCE after deploying to Vercel to register webhooks
// Usage: node scripts/setup.js
// ============================================================

import "dotenv/config";
import { registerTelegramWebhook } from "../lib/telegram.js";
import { getAllClientsConfig } from "../config/clients.js";

const VERCEL_URL = process.env.VERCEL_URL || process.env.APP_URL;

async function setup() {
  if (!VERCEL_URL) {
    console.error("❌ Set VERCEL_URL or APP_URL in your .env file");
    console.error("   Example: APP_URL=https://your-app.vercel.app");
    process.exit(1);
  }

  console.log(`\n🚀 Setting up webhooks for: ${VERCEL_URL}\n`);

  try {
    const clients = await getAllClientsConfig();

    for (const [clientId, config] of Object.entries(clients)) {
      console.log(`── Client: ${config.name} (${clientId}) ──`);

      // Register Telegram webhook
      if (config.telegram?.botToken) {
        const webhookUrl = `${VERCEL_URL}/api/telegram/${clientId}`;
        console.log(`   Registering Telegram webhook: ${webhookUrl}`);

        const result = await registerTelegramWebhook(config.telegram.botToken, webhookUrl);

        if (result.ok) {
          console.log(`   ✅ Telegram webhook registered!`);
        } else {
          console.error(`   ❌ Telegram webhook failed:`, result.description || "Unknown error");
        }
      } else {
        console.log(`   ⚠️  No Telegram token for ${clientId}, skipping`);
      }

      // Facebook webhook is registered manually in Meta dashboard
      if (config.facebook?.pageAccessToken) {
        const fbWebhookUrl = `${VERCEL_URL}/api/facebook/${clientId}`;
        console.log(`\n   📋 Facebook webhook URL (paste this in Meta dashboard):`);
        console.log(`   ${fbWebhookUrl}`);
        console.log(`   Verify Token: ${config.facebook.verifyToken}`);
      }

      console.log("");
    }

    console.log("✅ Setup complete!\n");
    console.log("Next steps for Facebook:");
    console.log("1. Go to developers.facebook.com → Your App → Webhooks");
    console.log("2. Add the Facebook webhook URL shown above");
    console.log("3. Enter your Verify Token");
    console.log("4. Subscribe to: messages, messaging_postbacks, feed");
    console.log("5. Link your Page to the App\n");
  } catch (err) {
    console.error("❌ Setup failed:", err);
  }
}

setup().catch(console.error);
