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
