// ========================================
// StatusCraft AI - Main JavaScript (Phase 2)
// ========================================

let QUOTES_DATA = {};
let currentQuote = "";
let generatedImageUrl = "";

// ------------------------------------
// Quotes data load karo (fallback ke liye)
// ------------------------------------

async function loadQuotes() {

  try {

    const response = await fetch("quotes.json");
    QUOTES_DATA = await response.json();

  } catch (error) {

    console.error("Quotes load error:", error);
  }
}


// ------------------------------------
// Static fallback quote (JSON se)
// ------------------------------------

function getRandomQuote() {

  const category =
    document.getElementById("category")?.value || "Motivational";

  const language =
    document.getElementById("language")?.value || "Hindi";

  const list =
    QUOTES_DATA?.[category]?.[language] || [];

  if (list.length === 0) {
    return "Quote उपलब्ध नहीं है इस भाषा/category में।";
  }

  const randomIndex =
    Math.floor(Math.random() * list.length);

  return list[randomIndex];
}


// ------------------------------------
// 🆕 Quote history — repeat rokne ke liye
// (localStorage mein last 50 quotes yaad rakhte hain)
// ------------------------------------

const QUOTE_HISTORY_KEY = "statuscraft_quote_history";
const QUOTE_HISTORY_LIMIT = 50;

function getQuoteHistory() {

  try {

    const raw = localStorage.getItem(QUOTE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];

  } catch (error) {

    return [];
  }
}

function addToQuoteHistory(quote) {

  try {

    const history = getQuoteHistory();

    history.push(quote);

    // Sirf latest 50 hi rakho, purane hata do
    while (history.length > QUOTE_HISTORY_LIMIT) {
      history.shift();
    }

    localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(history));

  } catch (error) {

    console.error("Quote history save error:", error);
  }
}


// ------------------------------------
// 🆕 AI quote — worker ke /api/generate-quote se
// ------------------------------------

async function fetchAIQuote() {

  const category =
    document.getElementById("category")?.value || "Motivational";

  const language =
    document.getElementById("language")?.value || "Hindi";

  // 🆕 User ka mood/feeling (optional)
  const feeling =
    document.getElementById("feeling")?.value.trim() || "";

  // Recent history bhej rahe hain taaki AI repeat na kare
  const recentQuotes = getQuoteHistory().slice(-20);

  const response = await fetch("/api/generate-quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      language,
      category,
      feeling,
      recentQuotes
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.quote) {
    throw new Error(data?.error || "AI quote नहीं मिली।");
  }

  addToQuoteHistory(data.quote);

  // 🆕 Har naye quote ke baad counter refresh karo
  refreshStatsCounter();

  return data.quote;
}


// ------------------------------------
// 🆕 AI try karo, fail ho toh static fallback
// ------------------------------------

async function getNewQuote() {

  try {

    return await fetchAIQuote();

  } catch (error) {

    console.error("AI quote error, falling back:", error);

    return getRandomQuote();
  }
}


// ------------------------------------
// 🆕 Live counter — total status generated
// ------------------------------------

async function refreshStatsCounter() {

  try {

    const response = await fetch("/api/stats");
    const data = await response.json();

    const counterEl = document.getElementById("statsCounter");
    const countEl = document.getElementById("statsCount");

    if (data && typeof data.count === "number" && countEl && counterEl) {
      countEl.textContent = data.count.toLocaleString("en-IN");
      counterEl.style.display = "block";
    }

  } catch (error) {

    console.error("Stats fetch error:", error);
  }
}


document.addEventListener("DOMContentLoaded", async function () {

  await loadQuotes();

  refreshStatsCounter();

  const quoteText =
    document.getElementById("quoteText");

  const getQuoteBtn =
    document.getElementById("getQuoteBtn");

  if (getQuoteBtn) {

    getQuoteBtn.addEventListener("click", async function () {

      const originalHtml = getQuoteBtn.innerHTML;

      getQuoteBtn.disabled = true;
      getQuoteBtn.innerHTML =
        '<span class="spinner"></span> Quote बना रहा है...';

      if (quoteText) {
        quoteText.textContent = "...";
      }

      currentQuote = await getNewQuote();

      if (quoteText) {
        quoteText.textContent = currentQuote;
      }

      getQuoteBtn.disabled = false;
      getQuoteBtn.innerHTML = originalHtml;
    });
  }

  // Pehli quote — static (turant dikhe, AI ka wait na karna pade)
  currentQuote = getRandomQuote();

  if (quoteText) {
    quoteText.textContent = currentQuote;
  }


  // ------------------------------------
  // 🆕 Photo upload card (preview + remove)
  // ------------------------------------

  const photoInput =
    document.getElementById("photoInput");

  const photoPreview =
    document.getElementById("photoPreview");

  const uploadCard =
    document.getElementById("uploadCard");

  const removePhotoBtn =
    document.getElementById("removePhotoBtn");

  if (photoInput) {

    photoInput.addEventListener("change", function () {

      const file = this.files[0];

      if (file && photoPreview) {

        photoPreview.src = URL.createObjectURL(file);

        if (uploadCard) {
          uploadCard.classList.add("hasPhoto");
        }
      }
    });
  }

  if (removePhotoBtn) {

    removePhotoBtn.addEventListener("click", function (e) {

      e.stopPropagation();

      if (photoInput) photoInput.value = "";
      if (photoPreview) photoPreview.src = "";

      if (uploadCard) {
        uploadCard.classList.remove("hasPhoto");
      }
    });
  }


  // ------------------------------------
  // Create My Status
  // ------------------------------------

  const generateBtn =
    document.getElementById("generateStatusBtn");

  if (generateBtn) {

    generateBtn.addEventListener("click", generateStatus);
  }


  // ------------------------------------
  // 🆕 Create Another (reset result view)
  // ------------------------------------

  const createAnotherBtn =
    document.getElementById("createAnotherBtn");

  if (createAnotherBtn) {

    createAnotherBtn.addEventListener("click", async function () {

      const resultActions =
        document.getElementById("resultActions");

      const previewPlaceholder =
        document.getElementById("previewPlaceholder");

      const generatedStatus =
        document.getElementById("generatedStatus");

      if (resultActions) {
        resultActions.classList.remove("show");
      }

      if (generatedStatus) {
        generatedStatus.style.display = "none";
        generatedStatus.src = "";
      }

      if (previewPlaceholder) {
        previewPlaceholder.style.display = "flex";
      }

      if (quoteText) {
        quoteText.textContent = "...";
      }

      currentQuote = await getNewQuote();

      if (quoteText) {
        quoteText.textContent = currentQuote;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

});


// ------------------------------------
// Template color presets
// ------------------------------------

const TEMPLATE_COLORS = {

  purple: {
    from: "#3a1c71",
    to: "#7b4de0",
    text: "#ffffff",
    accent: "#f6c453",
    highlights: ["#f6c453", "#ff8fa3", "#8ee6c9", "#c9a7ff"]
  },

  sunset: {
    from: "#ff512f",
    to: "#f09819",
    text: "#ffffff",
    accent: "#ffe9c7",
    highlights: ["#ffe9c7", "#ffd166", "#06d6a0", "#ff8fa3"]
  },

  ocean: {
    from: "#005c97",
    to: "#363795",
    text: "#ffffff",
    accent: "#8fd3f4",
    highlights: ["#8fd3f4", "#ffd166", "#f6c453", "#a8ffce"]
  },

  gold: {
    from: "#bf953f",
    to: "#3a2c0f",
    text: "#ffffff",
    accent: "#fcf6ba",
    highlights: ["#fcf6ba", "#ff8fa3", "#8ee6c9", "#f6c453"]
  }

};


// ------------------------------------
// 🆕 Line ko multi-color words ke saath draw karo
// (kuch words random highlight color mein, baaki
// normal text color mein — sundar/eye-catching look)
// ------------------------------------

function drawStyledLine(ctx, line, centerX, y, textColor, highlightColors) {

  const words = line.split(" ").filter(function (w) { return w.length > 0; });

  if (words.length === 0) return;

  // Kaunse words highlight honge — roughly 30-40% words,
  // kam se kam 1 (agar line mein 2+ words hain)
  const highlightCount =
    words.length > 1
      ? Math.max(1, Math.round(words.length * 0.35))
      : 0;

  const indices = words.map(function (_, i) { return i; });

  // Shuffle karke pehle N indices highlight ke liye le lo
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const highlightSet = new Set(indices.slice(0, highlightCount));

  const spaceWidth = ctx.measureText(" ").width;

  const wordWidths = words.map(function (w) {
    return ctx.measureText(w).width;
  });

  const totalWidth =
    wordWidths.reduce(function (a, b) { return a + b; }, 0) +
    spaceWidth * (words.length - 1);

  const originalAlign = ctx.textAlign;
  ctx.textAlign = "left";

  let x = centerX - totalWidth / 2;

  words.forEach(function (word, i) {

    if (highlightSet.has(i)) {
      const randomColor =
        highlightColors[
          Math.floor(Math.random() * highlightColors.length)
        ];
      ctx.fillStyle = randomColor;
    } else {
      ctx.fillStyle = textColor;
    }

    ctx.fillText(word, x, y);

    x += wordWidths[i] + spaceWidth;
  });

  ctx.textAlign = originalAlign;
}

function wrapText(ctx, text, maxWidth) {

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach(function (word) {

    const testLine =
      currentLine ? currentLine + " " + word : word;

    const testWidth =
      ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}


// ------------------------------------
// Status image generate karo (canvas)
// ------------------------------------

async function generateStatus() {

  if (!currentQuote) {

    if (window.showToast) {
      window.showToast("पहले 'Generate Quote' दबाएं।", "error");
    } else {
      alert("पहले 'Generate Quote' दबाएं।");
    }
    return;
  }

  const button =
    document.getElementById("generateStatusBtn");

  const originalButtonHtml =
    button ? button.innerHTML : "";

  if (button) {
    button.disabled = true;
    button.innerHTML =
      '<span class="spinner"></span> Status बना रहा है...';
  }

  // 🆕 Preview area mein pulse animation dikhao jab tak status ban raha hai
  const previewFrameEl = document.getElementById("previewFrame");
  if (previewFrameEl) {
    previewFrameEl.classList.add("skeletonPulse");
  }

  try {

    const templateKey =
      document.getElementById("templateStyle")?.value || "purple";

    const colors =
      TEMPLATE_COLORS[templateKey] || TEMPLATE_COLORS.purple;

    const userName =
      document.getElementById("userName")?.value.trim() || "";

    const photoInput =
      document.getElementById("photoInput");

    const photoFile =
      photoInput?.files?.[0] || null;


    // ------------------------------------
    // 🆕 Canvas setup — selected format ke
    // hisaab se size decide karo
    // ------------------------------------

    const FORMAT_SIZES = {
      square: { width: 1080, height: 1080 },
      status: { width: 1080, height: 1920 },
      post: { width: 1080, height: 1350 }
    };

    const formatKey =
      document.getElementById("format")?.value || "square";

    const format =
      FORMAT_SIZES[formatKey] || FORMAT_SIZES.square;

    const canvas =
      document.createElement("canvas");

    canvas.width = format.width;
    canvas.height = format.height;

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const centerX = canvasW / 2;

    const ctx =
      canvas.getContext("2d");


    // ------------------------------------
    // Background priority:
    // 1) User ki apni uploaded photo (full frame)
    // 2) AI-generated matching photo
    // 3) Gradient fallback
    // ------------------------------------

    let backgroundDrawn = false;

    // Cover-fit drawing helper — image ko poore canvas
    // mein bina squeeze/stretch kiye fill karta hai
    function drawImageCover(image) {

      const imgRatio = image.width / image.height;
      const canvasRatio = canvasW / canvasH;

      let drawWidth, drawHeight, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawHeight = canvasH;
        drawWidth = canvasH * imgRatio;
        drawX = (canvasW - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = canvasW;
        drawHeight = canvasW / imgRatio;
        drawX = 0;
        drawY = (canvasH - drawHeight) / 2;
      }

      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    if (photoFile) {

      // ---- 1) User ki apni photo ko full-frame background banao ----

      try {

        const photoDataUrl =
          await new Promise(function (resolve, reject) {

            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = () =>
              reject(new Error("Photo read नहीं हो पाई।"));

            reader.readAsDataURL(photoFile);
          });

        const userImage =
          await new Promise(function (resolve, reject) {

            const image = new Image();

            image.onload = () => resolve(image);
            image.onerror = () =>
              reject(new Error("Photo load नहीं हो पाई।"));

            image.src = photoDataUrl;
          });

        drawImageCover(userImage);

        // Text readable rakhne ke liye dark gradient overlay
        // (upar halka, neeche zyada dark — jaha text hoga)
        const overlay =
          ctx.createLinearGradient(0, 0, 0, canvasH);

        overlay.addColorStop(0, "rgba(0,0,0,0.45)");
        overlay.addColorStop(0.5, "rgba(0,0,0,0.35)");
        overlay.addColorStop(1, "rgba(0,0,0,0.55)");

        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, canvasW, canvasH);

        backgroundDrawn = true;

      } catch (photoError) {

        console.error("StatusCraft Photo Background Error:", photoError);
      }
    }

    if (!backgroundDrawn) {

      // ---- 2) AI se quote-matching background try karo ----

      try {

        if (button) {
          button.innerHTML =
            '<span class="spinner"></span> AI matching photo बना रहा है...';
        }

        const category =
          document.getElementById("category")?.value || "";

        const bgResponse = await fetch(
          "/api/generate-quote-background",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              quote: currentQuote,
              category
            })
          }
        );

        const bgData = await bgResponse.json();

        if (
          bgResponse.ok &&
          bgData.success &&
          bgData.image
        ) {

          const bgImage =
            await new Promise(function (resolve, reject) {

              const image = new Image();

              image.onload = () => resolve(image);
              image.onerror = () =>
                reject(new Error("AI background load नहीं हो पाई।"));

              image.src = bgData.image;
            });

          drawImageCover(bgImage);

          // Text readable rakhne ke liye halka dark overlay
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(0, 0, canvasW, canvasH);

          backgroundDrawn = true;
        }

      } catch (bgError) {

        console.error("StatusCraft Background Error:", bgError);
      }
    }

    if (button) {
      button.innerHTML =
        '<span class="spinner"></span> Status बना रहा है...';
    }

    if (!backgroundDrawn) {

      // ---- 3) Gradient fallback ----

      const gradient =
        ctx.createLinearGradient(0, 0, canvasW, canvasH);

      gradient.addColorStop(0, colors.from);
      gradient.addColorStop(1, colors.to);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }


    // ------------------------------------
    // Decorative quote mark
    // ------------------------------------

    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.25;
    ctx.font = "bold 220px Georgia";
    ctx.fillText("\u201C", 60, 260);
    ctx.globalAlpha = 1;


    // ------------------------------------
    // Quote text (wrapped, centered)
    // ------------------------------------

    ctx.fillStyle = colors.text;
    ctx.textAlign = "center";
    ctx.font = "900 76px Georgia";

    // Text ke peeche halka shadow — full-photo background par
    // bhi bold shayari saaf padhi jaye
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;

    const maxTextWidth = Math.min(940, canvasW - 140);
    const lines = wrapText(ctx, currentQuote, maxTextWidth);

    const lineHeight = 94;
    const totalTextHeight = lines.length * lineHeight;
    let startY = (canvasH - totalTextHeight) / 2;

    // Photo/name jagah ke liye thoda upar shift karo
    if (photoFile || userName) {
      startY -= 60;
    }

    lines.forEach(function (line, i) {
      drawStyledLine(
        ctx,
        line,
        centerX,
        startY + (i * lineHeight),
        colors.text,
        colors.highlights
      );
    });

    // Shadow reset — neeche ke elements (name) par asar na ho
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;


    // ------------------------------------
    // Name (photo ab full-frame background hai,
    // isliye chhota circle nahi dikhana — sirf naam)
    // ------------------------------------

    if (userName) {

      const contentBottomY =
        startY + (lines.length * lineHeight) + 50;

      ctx.font = "bold 34px Arial";
      ctx.fillStyle = colors.accent;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.fillText("— " + userName, centerX, contentBottomY);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }


    // ------------------------------------
    // Branding
    // ------------------------------------

    ctx.font = "24px Arial";
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.75;
    ctx.fillText("✨ StatusCraft AI", centerX, canvasH - 70);
    ctx.globalAlpha = 1;


    // ------------------------------------
    // Result dikhao (preview panel mein)
    // ------------------------------------

    generatedImageUrl =
      canvas.toDataURL("image/jpeg", 0.92);

    const previewPlaceholder =
      document.getElementById("previewPlaceholder");

    const resultImg =
      document.getElementById("generatedStatus");

    const resultActions =
      document.getElementById("resultActions");

    if (resultImg) {
      resultImg.src = generatedImageUrl;
      resultImg.style.display = "block";
      resultImg.classList.remove("fadeInImg");
      void resultImg.offsetWidth; // reflow force karo taaki animation dobara chale
      resultImg.classList.add("fadeInImg");
    }

    if (previewFrameEl) {
      previewFrameEl.classList.remove("skeletonPulse");
    }

    if (previewPlaceholder) {
      previewPlaceholder.style.display = "none";
    }

    if (resultActions) {
      resultActions.classList.add("show");
    }

    // Preview panel tak smooth scroll (mobile par especially useful)
    const previewFrame =
      document.getElementById("previewFrame");

    if (previewFrame && window.innerWidth < 900) {
      previewFrame.scrollIntoView({ behavior: "smooth", block: "center" });
    }


    // ------------------------------------
    // Download + Share buttons wire karo
    // ------------------------------------

    setupResultActions();


  } catch (error) {

    console.error("StatusCraft Generate Error:", error);

    if (window.showToast) {
      window.showToast("Status बनाने में समस्या हुई: " + error.message, "error");
    } else {
      alert(
        "❌ Status बनाने में समस्या हुई:\n\n" + error.message
      );
    }

  } finally {

    if (button) {
      button.disabled = false;
      button.innerHTML = originalButtonHtml;
    }

    if (previewFrameEl) {
      previewFrameEl.classList.remove("skeletonPulse");
    }
  }
}

window.generateStatus = generateStatus;


// ------------------------------------
// 🆕 Download + Share button wiring
// (WhatsApp/Instagram/Facebook/Telegram sab
// same native share sheet kholte hain — jaha
// user apna target app khud choose karta hai,
// kyunki browser se seedha kisi specific app
// mein image bhejna technically possible nahi)
// ------------------------------------

function setupResultActions() {

  const downloadBtn =
    document.getElementById("downloadStatusBtn");

  if (downloadBtn) {

    downloadBtn.onclick = function () {

      const link = document.createElement("a");
      const formatKey =
        document.getElementById("format")?.value || "square";
      link.download = "StatusCraftAI-" + formatKey + ".jpg";
      link.href = generatedImageUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
  }


  async function shareStatus() {

    try {

      const blobResponse = await fetch(generatedImageUrl);
      const blob = await blobResponse.blob();

      const file = new File(
        [blob],
        "StatusCraftAI-Status.jpg",
        { type: "image/jpeg" }
      );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {

        await navigator.share({
          title: "StatusCraft AI",
          text: currentQuote,
          files: [file]
        });

      } else {

        if (window.showToast) {
          window.showToast("इस browser में sharing उपलब्ध नहीं है। पहले Download करें।", "info");
        } else {
          alert("इस browser में sharing उपलब्ध नहीं है। पहले Download करें।");
        }
      }

    } catch (shareError) {

      if (shareError.name !== "AbortError") {
        if (window.showToast) {
          window.showToast("Status share नहीं हो पाया।", "error");
        } else {
          alert("❌ Status share नहीं हो पाया।");
        }
      }
    }
  }

  [
    "shareStatusBtn",
    "whatsappBtn",
    "instagramBtn",
    "facebookBtn",
    "telegramBtn"
  ].forEach(function (id) {

    const btn = document.getElementById(id);

    if (btn) {
      btn.onclick = shareStatus;
    }
  });
}

window.setupResultActions = setupResultActions;
