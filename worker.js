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
          feeling     // optional free-text mood from the user
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

        const prompt = `
You are a quote-writing assistant for a status/shayari app called StatusCraft AI.

Write ONE original, short, emotionally resonant quote in ${language}.

Category / theme: ${category}
${feelingLine}

RULES:
- Output ONLY the quote text itself. No preamble, no explanation, no quotation marks, no author name.
- Include 1-2 relevant emoji that match the mood/theme (e.g. ❤️ for love, 💪 for motivational, 🙏 for spiritual, ☀️ for good morning) — place them naturally at the start or end of the quote, not scattered randomly.
- Keep it short enough for a mobile status image (max 2 lines / ~25 words), emoji included.
- Do NOT attribute it to any real person — this must be an original line.
- If the language is Hindi, write it in Devanagari script.
- If the language is Hinglish, write Hindi words using English/Roman letters.
- Make it feel warm, human, and fresh — avoid generic clichés.
`;

        // ------------------------------------
        // 🤖 CLOUDFLARE WORKERS AI (Llama)
        // ------------------------------------

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 120
          }
        );

        const quoteText =
          result?.response?.trim() ||
          null;

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
