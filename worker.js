const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

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
    // 📝 AI QUOTE GENERATION (NEW - Phase 2)
    // ========================================

    if (
      url.pathname === "/api/generate-quote" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();

        const {
          language,   // e.g. "Hindi", "English", "Hinglish"
          category,   // e.g. "Motivational", "Love", "Friendship"
          feeling,    // optional free-text mood from the user
          recentQuotes // 🆕 array of quotes already shown to this user
        } = body;

        // ------------------------------------
        // Validation
        // ------------------------------------

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

        // ------------------------------------
        // 🎯 PROMPT
        // ------------------------------------

        const feelingLine = feeling
          ? `The user currently feels: "${feeling}". Let this subtly shape the quote's tone.`
          : "";

        // ------------------------------------
        // 🎲 Random style angle — har request pe
        // alag style force karo taaki quotes
        // baar-baar repeat/similar na lagein
        // ------------------------------------

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

        const randomStyle =
          STYLE_VARIATIONS[
            Math.floor(Math.random() * STYLE_VARIATIONS.length)
          ];

        // Randomness seed — model ko har baar naya context
        // dikhta hai, isse cache-jaisa repeat kam hota hai
        const randomSeed =
          Math.random().toString(36).slice(2, 10);

        // ------------------------------------
        // 🆕 GLOBAL duplicate check — KV se
        // (sirf is user ka history nahi, PURE APP
        // ke saare users ke quotes is language+category
        // ke liye yaha store hote hain)
        // ------------------------------------

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

        // AI ko dikhane ke liye — global list se latest kuch
        // + client ne jo bheja (recentQuotes) dono milakar
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

        // ------------------------------------
        // 🤖 CLOUDFLARE WORKERS AI (Llama)
        // 🆕 Retry up to 3 baar agar output kisi
        // bhi purane global quote se exact match kare
        // ------------------------------------

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

          quoteText = candidate; // last attempt ka result rakh lo, fallback ke liye
        }

        // ------------------------------------
        // 🆕 Naya quote global list mein save karo
        // (KV mein) — taaki agla koi bhi user isse
        // dobara na paye
        // ------------------------------------

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

          } catch (kvWriteError) {

            console.error("KV write error:", kvWriteError);
          }
        }

        if (!quoteText) {

          throw new Error(
            "AI quote generate nahi ho payi."
          );

        }

        // ------------------------------------
        // RESPONSE
        // ------------------------------------

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

        return Response.json(
          {
            success: false,
            error:
              error?.message ||
              String(error) ||
              "Quote generation failed."
          },
          {
            status: 500,
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
          category
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
        // 🎯 PROMPT — quote ke mood/meaning
        // ke hisaab se ek matching scene
        // ------------------------------------

        const prompt = `
Create a beautiful, atmospheric photograph-style background image
that visually represents the mood and meaning of this quote.

QUOTE (do not render this text in the image, only capture its feeling):
"${quote}"

CATEGORY / MOOD: ${category || "general inspiration"}

IMPORTANT:
- Do NOT include any text, letters or words in the image.
- Do NOT include any logos or watermarks.
- Use a cinematic, emotionally resonant scene — nature, light,
  silhouettes, or abstract atmosphere that matches the quote's feeling.
- Leave breathing room (uncluttered areas) so text can be overlaid
  on top later.
- Soft, warm, high-quality photographic lighting.
- Vertical composition, suitable for a mobile status/story image.
`;


        // ------------------------------------
        // 🤖 CLOUDFLARE WORKERS AI (Flux)
        // ------------------------------------

        const result = await env.AI.run(
          "@cf/black-forest-labs/flux-1-schnell",
          {
            prompt: prompt,
            steps: 6
          }
        );


        // ------------------------------------
        // 🖼️ IMAGE (base64 PNG)
        // ------------------------------------

        const base64Image =
          result?.image ||
          null;


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

        return Response.json(
          {
            success: false,
            error:
              error?.message ||
              String(error) ||
              "Background generation failed."
          },
          {
            status: 500,
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
