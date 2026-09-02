const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const STYLE_VARIATIONS = [
  "Write it as a short, punchy one-liner.",
  "Write it as a two-line poetic shayari with a natural rhythm.",
  "Write it as a gentle, reflective thought.",
  "Write it as a bold, energetic statement.",
  "Write it using a nature or seasons metaphor.",
  "Write it using a light/journey/path metaphor.",
  "Write it as a heartfelt, conversational line, like talking to a close friend.",
  "Write it with a subtle rhyme or wordplay.",
  "Write it as a simple, everyday-life observation with deep meaning.",
  "Write it as an uplifting message someone would send at sunrise."
];

// ------------------------------------
// 🆕 Reusable quote-generation core —
// /api/generate-quote aur /api/daily-quote
// dono isi function ko use karte hain
// ------------------------------------

async function generateUniqueQuote(env, language, category, feeling, recentQuotes, instruction) {

  const feelingLine = feeling
    ? `The user currently feels: "${feeling}". Let this subtly shape the quote's tone.`
    : "";

  // 🆕 Extra one-off instruction (used by "AI Edit" quick actions
  // like Make More Emotional, Shorter, More Powerful)
  const instructionLine = instruction
    ? `Additional instruction for this generation: ${instruction}`
    : "";

  const randomStyle =
    STYLE_VARIATIONS[
      Math.floor(Math.random() * STYLE_VARIATIONS.length)
    ];

  const randomSeed =
    Math.random().toString(36).slice(2, 10);

  const kvKey = `quotes:${language}:${category}`;
  const KV_LIST_LIMIT = 500;

  let globalQuoteList = [];

  if (env.QUOTES_KV) {

    try {

      const stored = await env.QUOTES_KV.get(kvKey);
      globalQuoteList = stored ? JSON.parse(stored) : [];

    } catch (kvReadError) {

      console.error("KV read error:", kvReadError);
      globalQuoteList = [];
    }
  }

  const clientRecent =
    Array.isArray(recentQuotes) ? recentQuotes : [];

  const avoidList = Array.from(
    new Set([
      ...globalQuoteList.slice(-30),
      ...clientRecent.slice(-20)
    ])
  );

  const avoidBlock =
    avoidList.length > 0
      ? `

The following quotes have already been shown to users. Do NOT repeat
any of them, and do NOT write anything that closely resembles their
wording or structure — generate something genuinely different:
${avoidList.map(function (q) { return "- " + q; }).join("\n")}`
      : "";

  function buildPrompt() {

    return `
You are a quote-writing assistant for a status/shayari app called StatusCraft AI.

Write ONE original, short, emotionally resonant quote in ${language}.

Category / theme: ${category}
${feelingLine}
${instructionLine}
Style for this one: ${randomStyle}
(variation id: ${randomSeed} — use this only to ensure freshness, do not mention it)
${avoidBlock}

RULES:
- Output ONLY the quote text itself. No preamble, no explanation, no quotation marks, no author name.
- Include 1-2 relevant emoji that match the mood/theme (e.g. ❤️ for love, 💪 for motivational, 🙏 for spiritual, ☀️ for good morning) — place them naturally at the start or end of the quote, not scattered randomly.
- Keep it short enough for a mobile status image (max 2 lines / ~25 words), emoji included.
- Do NOT attribute it to any real person — this must be an original line.
- Do NOT reuse common, overused, cliché quotes — make it feel fresh and specific.
- Write the quote in the NATIVE SCRIPT of the specified language (for example: Devanagari for Hindi/Marathi/Nepali/Sanskrit/Konkani/Maithili/Dogri/Bodo, Bengali script for Bengali/Assamese, Gurmukhi for Punjabi, Gujarati script for Gujarati, Tamil script for Tamil, Telugu script for Telugu, Kannada script for Kannada, Malayalam script for Malayalam, Odia script for Odia, Perso-Arabic script for Urdu/Sindhi/Kashmiri, Ol Chiki for Santali, Meitei Mayek or Bengali script for Manipuri).
- Exception: if the language is exactly "Hinglish", write Hindi words using Roman/English letters instead of Devanagari.
- If you are not fully confident in a requested language's script, still write a warm, correct quote in that language using its most commonly used script, rather than falling back to Hindi or English.
- Make it feel warm, human, and fresh — avoid generic clichés.
`;
  }

  let quoteText = null;

  for (let attempt = 0; attempt < 3; attempt++) {

    const result = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "user", content: buildPrompt() }
        ],
        max_tokens: 120,
        temperature: 1.3
      }
    );

    const candidate = result?.response?.trim() || null;

    const isDuplicate =
      candidate &&
      globalQuoteList.some(function (q) {
        return q.trim() === candidate.trim();
      });

    if (candidate && !isDuplicate) {
      quoteText = candidate;
      break;
    }

    quoteText = candidate;
  }

  if (env.QUOTES_KV && quoteText) {

    try {

      globalQuoteList.push(quoteText);

      while (globalQuoteList.length > KV_LIST_LIMIT) {
        globalQuoteList.shift();
      }

      await env.QUOTES_KV.put(
        kvKey,
        JSON.stringify(globalQuoteList)
      );

      const currentCount = await env.QUOTES_KV.get("stats:totalQuotes");
      const newCount = (currentCount ? parseInt(currentCount, 10) || 0 : 0) + 1;
      await env.QUOTES_KV.put("stats:totalQuotes", String(newCount));

    } catch (kvWriteError) {

      console.error("KV write error:", kvWriteError);
    }
  }

  return quoteText;
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // OPTIONS / CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // ========================================
    // 📊 STATS — total quotes generated so far
    // ========================================

    if (
      url.pathname === "/api/stats" &&
      request.method === "GET"
    ) {

      try {

        let count = 0;

        if (env.QUOTES_KV) {
          const stored = await env.QUOTES_KV.get("stats:totalQuotes");
          count = stored ? parseInt(stored, 10) || 0 : 0;
        }

        return Response.json(
          { success: true, count },
          { status: 200, headers: corsHeaders }
        );

      } catch (error) {

        return Response.json(
          { success: false, count: 0 },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // ========================================
    // 🌅 DAILY INSPIRATION — ek fixed quote
    // pure din ke liye, sab users ko same dikhta hai
    // ========================================

    if (
      url.pathname === "/api/daily-quote" &&
      request.method === "GET"
    ) {

      try {

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const dailyKey = `daily:${today}`;

        if (env.QUOTES_KV) {

          const cached = await env.QUOTES_KV.get(dailyKey);

          if (cached) {
            return Response.json(
              { success: true, quote: cached, date: today },
              { status: 200, headers: corsHeaders }
            );
          }
        }

        const quote = await generateUniqueQuote(
          env,
          "Hindi",
          "Motivational",
          "",
          []
        );

        if (!quote) {
          throw new Error("Daily quote generate nahi ho payi.");
        }

        if (env.QUOTES_KV) {
          await env.QUOTES_KV.put(dailyKey, quote);
        }

        return Response.json(
          { success: true, quote, date: today },
          { status: 200, headers: corsHeaders }
        );

      } catch (error) {

        console.error("Daily quote error:", error);

        // 🆕 200 status — yeh ek expected/handled failure hai
        // (AI temporarily unavailable), server crash nahi. Isse
        // Cloudflare ke 5xx error metrics galat tarike se
        // inflate nahi honge.
        return Response.json(
          { success: false, error: error?.message || String(error) },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // ========================================
    // 📝 AI QUOTE GENERATION (Phase 2)
    // ========================================

    if (
      url.pathname === "/api/generate-quote" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();

        const {
          language,
          category,
          feeling,
          recentQuotes,
          instruction
        } = body;

        if (!language || !category) {

          return Response.json(
            {
              success: false,
              error: "Language and category are required."
            },
            {
              status: 400,
              headers: corsHeaders
            }
          );

        }

        const quoteText = await generateUniqueQuote(
          env,
          language,
          category,
          feeling,
          recentQuotes,
          instruction
        );

        if (!quoteText) {

          throw new Error(
            "AI quote generate nahi ho payi."
          );

        }

        return Response.json(
          {
            success: true,
            quote: quoteText
          },
          {
            status: 200,
            headers: corsHeaders
          }
        );

      } catch (error) {

        console.error(
          "Quote generation error:",
          error
        );

        // 🆕 200 status — app.js already retries + falls back
        // gracefully on success:false, isliye yeh genuine server
        // crash nahi hai, ek handled/expected condition hai
        return Response.json(
          {
            success: false,
            error:
              error?.message ||
              String(error) ||
              "Quote generation failed."
          },
          {
            status: 200,
            headers: corsHeaders
          }
        );

      }

    }

    // ========================================
    // 🖼️ AI BACKGROUND MATCHING THE QUOTE
    // ========================================

    if (
      url.pathname === "/api/generate-quote-background" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();

        const {
          quote,
          category,
          style // 🆕 e.g. "cinematic", "artistic", "dark", "luxury", "nature", "minimal", "dreamy", "photorealistic"
        } = body;


        // ------------------------------------
        // Validation
        // ------------------------------------

        if (!quote) {

          return Response.json(
            {
              success: false,
              error: "Quote is required."
            },
            {
              status: 400,
              headers: corsHeaders
            }
          );

        }


        // ------------------------------------
        // 🆕 Style ke hisaab se extra visual direction
        // ------------------------------------

        const STYLE_DIRECTIONS = {
          cinematic: "Cinematic film-still quality, dramatic lighting, wide dynamic range, movie-poster feel.",
          photorealistic: "Ultra photorealistic, DSLR photograph quality, natural lighting and textures.",
          artistic: "Painterly, artistic illustration style, expressive brushwork-like quality.",
          dark: "Moody, dark and mysterious tones, low-key lighting, dramatic shadows.",
          luxury: "Premium, luxurious aesthetic — gold accents, elegant textures, high-end feel.",
          nature: "Lush natural scenery, organic textures, soft natural light.",
          minimal: "Minimal, clean, uncluttered composition with lots of negative space.",
          dreamy: "Soft dreamy haze, pastel tones, gentle bokeh, ethereal atmosphere."
        };

        const styleDirection =
          STYLE_DIRECTIONS[style] || "";


        // ------------------------------------
        // 🎯 PROMPT — quote ke mood/meaning
        // ke hisaab se ek matching scene
        // ------------------------------------

        const prompt = `
Create a beautiful, atmospheric photograph-style background image
that visually represents the mood and meaning of this quote.

QUOTE (do not render this text in the image, only capture its feeling):
"${quote}"

CATEGORY / MOOD: ${category || "general inspiration"}
${styleDirection ? "VISUAL STYLE: " + styleDirection : ""}

IMPORTANT — absolutely no text or writing of any kind:
- The image must contain ZERO letters, characters, numbers, symbols,
  words, or writing in ANY language or script.
- Do not render any text-like shapes, calligraphy, signage, book
  pages, handwriting, or anything resembling readable characters.
- Do NOT include any logos or watermarks.
- Use a purely visual, wordless scene — nature, light, silhouettes,
  objects, or abstract atmosphere that matches the quote's feeling,
  with no lettering anywhere in the frame.
- Leave breathing room (uncluttered areas) so text can be overlaid
  on top later by the app itself.
- Soft, warm, high-quality photographic lighting.
- Vertical composition, suitable for a mobile status/story image.
`;


        // ------------------------------------
        // 🤖 CLOUDFLARE WORKERS AI (Flux)
        // 🆕 2 baar retry karo agar pehli koshish
        // fail ho jaye (transient AI hiccup)
        // ------------------------------------

        let base64Image = null;

        for (let attempt = 0; attempt < 2; attempt++) {

          try {

            const result = await env.AI.run(
              "@cf/black-forest-labs/flux-1-schnell",
              {
                prompt: prompt,
                steps: 6
              }
            );

            base64Image = result?.image || null;

            if (base64Image) break;

          } catch (aiError) {

            console.error("Flux attempt " + attempt + " failed:", aiError);
          }
        }


        // ------------------------------------
        // 🖼️ IMAGE (base64 PNG)
        // ------------------------------------

        if (!base64Image) {

          throw new Error(
            "AI background image नहीं मिली।"
          );

        }


        // ------------------------------------
        // RESPONSE
        // ------------------------------------

        return Response.json(
          {
            success: true,
            image: `data:image/png;base64,${base64Image}`
          },
          {
            status: 200,
            headers: corsHeaders
          }
        );


      } catch (error) {

        console.error(
          "Background generation error:",
          error
        );

        // 🆕 200 status — app.js ke paas already gradient
        // fallback hai jab background generation fail ho,
        // isliye yeh genuine server crash nahi hai
        return Response.json(
          {
            success: false,
            error:
              error?.message ||
              String(error) ||
              "Background generation failed."
          },
          {
            status: 200,
            headers: corsHeaders
          }
        );

      }

    }


    // ------------------------------------
    // 🌐 WEBSITE FILES
    // ------------------------------------

    if (env.ASSETS) {

      return env.ASSETS.fetch(request);

    }


    return new Response(
      "StatusCraft AI Worker is running.",
      {
        status: 200
      }
    );

  }
};
