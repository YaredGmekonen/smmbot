// ============================================================
// AI ENGINE (GEMINI 2.5 FLASH)
// Takes a comment/DM, sends to Gemini, gets smart reply back
// ============================================================

/**
 * Generate a smart reply for a given message using Google Gemini
 * @param {string} incomingMessage - The comment or DM text
 * @param {string} aiPersona - The business context/instructions
 * @param {string} knowledgeBase - Custom business Q&A facts fed by the user
 * @param {string} platform - 'telegram' or 'facebook'
 * @returns {Promise<string|null>} - Reply text, or null if should be ignored
 */
export async function generateReply(incomingMessage, aiPersona, knowledgeBase = "", platform = "telegram") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured in environment.");
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Combine persona and knowledge base into a single clear instruction set
    const systemPrompt = `${aiPersona}

${knowledgeBase ? `ADDITIONAL BUSINESS DATA / Q&A REFERENCE:\n${knowledgeBase}` : ""}

IMPORTANT: 
- If the message is spam, off-topic, or a scam, respond with exactly: NULL
- If it's a genuine customer question or greeting, reply naturally
- Keep replies SHORT (2-4 sentences max)
- Match the customer's language (default to Amharic if unsure)`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `New ${platform} message from customer: "${incomingMessage}"\n\nReply with your response only. If should be ignored, reply NULL.` }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", err);
      return null;
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    // If AI says NULL → don't reply
    if (!reply || reply === "NULL" || reply.toLowerCase() === "null") {
      return null;
    }

    return reply;
  } catch (error) {
    console.error("generateReply error:", error);
    return null;
  }
}
