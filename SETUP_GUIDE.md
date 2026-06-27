# 🤖 AI Social Media Bot — Setup Guide
## ገበሬው ነጋዴ + MakiBA | Telegram + Facebook Auto-Reply

---

## 📁 Project Structure

```
geberew-bot/
├── api/
│   ├── telegram/[clientId].js   ← Telegram webhook endpoint
│   └── facebook/[clientId].js   ← Facebook webhook endpoint
├── lib/
│   ├── ai.js                    ← Claude AI brain
│   ├── telegram.js              ← Telegram logic
│   └── facebook.js              ← Facebook logic
├── config/
│   └── clients.js               ← Client configs (prices, persona)
├── scripts/
│   └── setup.js                 ← Run once after deploy
├── .env.example                 ← Copy this to .env
├── vercel.json
└── package.json
```

---

## STEP 1 — Get Your Free API Keys

### 1A. Claude AI (Anthropic) — The Bot's Brain
1. Go to: **console.anthropic.com**
2. Sign up free
3. Go to "API Keys" → "Create Key"
4. Copy the key → save it as `ANTHROPIC_API_KEY`
5. Free tier: $5 credit (enough for ~10,000 auto-replies)

### 1B. Telegram Bot Token
1. Open Telegram → search **@BotFather**
2. Send: `/newbot`
3. Give your bot a name: `GeberewNegadeBot`
4. Give username: `GeberewNegade_bot`
5. BotFather gives you a token like: `1234567890:AAFxxxx`
6. Save as `GEBEREW_TELEGRAM_TOKEN`

**Add bot to your channel:**
1. Go to your Telegram channel settings
2. Administrators → Add Administrator
3. Search your bot username and add it
4. Give it "Post Messages" permission

---

## STEP 2 — Setup Facebook (Meta)

### 2A. Create Meta Developer Account
1. Go to: **developers.facebook.com**
2. Log in with your Facebook account
3. Click "Get Started" → verify your account

### 2B. Create an App
1. Click "Create App"
2. Choose: **"Business"** type
3. App name: `GeberewNegadeBot`
4. Click "Create App"

### 2C. Add Messenger & Webhooks
1. In your app dashboard → "Add Products"
2. Add **Messenger** → click "Set Up"
3. Add **Webhooks** → click "Set Up"

### 2D. Get Page Access Token
1. Messenger → Settings → "Access Tokens"
2. Select your Facebook Page (ገበሬው ነጋዴ)
3. Click "Generate Token"
4. Save as `GEBEREW_FB_PAGE_TOKEN`

### 2E. Get Page ID
1. Go to your Facebook Page
2. Click "About" → scroll down
3. Find "Page ID" (a long number like: 994741330379639)
4. Save as `GEBEREW_FB_PAGE_ID`

### 2F. Get App Secret
1. In app dashboard → Settings → Basic
2. Copy "App Secret"
3. Save as `GEBEREW_FB_APP_SECRET`

---

## STEP 3 — Deploy to Vercel (Free)

### 3A. Install tools
```bash
# Install Node.js from nodejs.org first, then:
npm install -g vercel
```

### 3B. Upload code to GitHub
```bash
# In your project folder:
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/geberew-bot.git
git push -u origin main
```

### 3C. Deploy on Vercel
```bash
vercel login    # opens browser to login
vercel          # deploys your project
# When asked: 
#   Setup? Y
#   Which scope? your account
#   Link? N
#   Deploy? Y
```

You'll get a URL like: `https://geberew-bot-xyz.vercel.app`

### 3D. Add Environment Variables in Vercel
1. Go to: **vercel.com/dashboard**
2. Click your project → "Settings" → "Environment Variables"
3. Add ALL variables from `.env.example` with your real values
4. Click "Save"
5. Redeploy: `vercel --prod`

---

## STEP 4 — Register Webhooks

### 4A. Register Telegram Webhook
```bash
# Run this after deploying (replace with your actual URL):
node scripts/setup.js
```

OR do it manually with this URL in your browser:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://your-app.vercel.app/api/telegram/geberew
```

### 4B. Register Facebook Webhook
1. Go to: **developers.facebook.com** → Your App → Webhooks
2. Click "Subscribe to this object" → choose **Page**
3. Callback URL: `https://your-app.vercel.app/api/facebook/geberew`
4. Verify Token: `geberew_secret_2024` (whatever you set)
5. Click "Verify and Save"
6. Subscribe to these events:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `feed` (for post comments)
7. Go to Messenger → Settings → link your Page to the webhook

---

## STEP 5 — Test It!

### Test Telegram:
1. Go to your Telegram channel
2. Post a comment: "ዋጋ ስንት ነው?"
3. Bot should reply within 3-5 seconds ✅

### Test Facebook:
1. Go to your Facebook Page
2. Comment on a post: "100 ኪሎ ስንት ነው?"
3. Bot should reply within 5-10 seconds ✅

### Test Facebook DM:
1. Open Meta Business Suite → Inbox
2. Send yourself a test DM
3. Bot should reply automatically ✅

---

## STEP 6 — Add Second Client (MakiBA)

The system already supports MakiBA! Just:
1. Create a second Telegram bot via @BotFather
2. Create a second Facebook app (or use same app, different page)
3. Add MakiBA environment variables to Vercel
4. Register webhook: `https://your-app.vercel.app/api/telegram/makiba`

---

## 🔧 Update Prices

When teff prices change, open `config/clients.js` and update:
```js
- ማኛ ጤፍ: 135 ብር  ← change this number
- ቀይ ጤፍ: 120 ብር  ← change this number
```
Then: `git add . && git commit -m "update prices" && git push`
Vercel auto-deploys in ~30 seconds. Done!

---

## 💰 Cost Breakdown

| Service | Cost |
|---------|------|
| Vercel hosting | FREE (100GB bandwidth) |
| Telegram Bot API | FREE (unlimited) |
| Facebook Graph API | FREE |
| Claude Haiku AI | ~$0.0004 per reply |
| **100 replies/day** | **~$1.20/month** |
| **500 replies/day** | **~$6/month** |

---

## ⚠️ Facebook Warning

Your app starts in **Development Mode**:
- Only replies to your own test users
- To go live: Meta Dashboard → App Review → Request "pages_messaging" permission
- Takes 1-5 business days
- Requires brief description of what the bot does

---

## 🚨 Common Problems

**Bot not replying on Telegram?**
- Check bot is added as admin to channel
- Verify webhook: `https://api.telegram.org/botTOKEN/getWebhookInfo`

**Facebook says "verification failed"?**
- Double-check your VERIFY_TOKEN matches exactly
- Make sure Vercel is deployed and running

**AI giving wrong prices?**
- Update prices in `config/clients.js` and redeploy
