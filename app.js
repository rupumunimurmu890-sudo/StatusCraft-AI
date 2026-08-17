// ========================================
// StatusCraft AI - Main JavaScript (Phase 1)
// ========================================

let QUOTES_DATA = {};
let currentQuote = "";

// ------------------------------------
// Quotes data load karo
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
// Random quote nikalo category + language se
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


document.addEventListener("DOMContentLoaded", async function () {

  await loadQuotes();

  const quoteText =
    document.getElementById("quoteText");

  const getQuoteBtn =
    document.getElementById("getQuoteBtn");

  if (getQuoteBtn) {

    getQuoteBtn.addEventListener("click", function () {

      currentQuote = getRandomQuote();

      if (quoteText) {
        quoteText.textContent = currentQuote;
      }
    });
  }

  // Pehli quote load hote hi dikha do
  currentQuote = getRandomQuote();

  if (quoteText) {
    quoteText.textContent = currentQuote;
  }


  // ------------------------------------
  // Photo preview
  // ------------------------------------

  const photoInput =
    document.getElementById("photoInput");

  const photoPreview =
    document.getElementById("photoPreview");

  if (photoInput) {

    photoInput.addEventListener("change", function () {

      const file = this.files[0];

      if (file && photoPreview) {
        photoPreview.src = URL.createObjectURL(file);
        photoPreview.style.display = "block";
      }
    });
  }


  // ------------------------------------
  // Generate Status
  // ------------------------------------

  const generateBtn =
    document.getElementById("generateStatusBtn");

  if (generateBtn) {

    generateBtn.addEventListener("click", generateStatus);
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
    accent: "#f6c453"
  },

  sunset: {
    from: "#ff512f",
    to: "#f09819",
    text: "#ffffff",
    accent: "#ffe9c7"
  },

  ocean: {
    from: "#005c97",
    to: "#363795",
    text: "#ffffff",
    accent: "#8fd3f4"
  },

  gold: {
    from: "#bf953f",
    to: "#3a2c0f",
    text: "#ffffff",
    accent: "#fcf6ba"
  }

};


// ------------------------------------
// Line wrap helper (canvas text wrap)
// ------------------------------------

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

    alert("पहले 'Get New Quote' दबाएं।");
    return;
  }

  const button =
    document.getElementById("generateStatusBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "⏳ Status बना रहा है...";
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
    // Canvas setup
    // ------------------------------------

    const canvas =
      document.createElement("canvas");

    canvas.width = 1080;
    canvas.height = 1080;

    const ctx =
      canvas.getContext("2d");


    // ------------------------------------
    // Background gradient
    // ------------------------------------

    const gradient =
      ctx.createLinearGradient(0, 0, 1080, 1080);

    gradient.addColorStop(0, colors.from);
    gradient.addColorStop(1, colors.to);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);


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
    ctx.font = "italic 52px Georgia";

    const maxTextWidth = 880;
    const lines = wrapText(ctx, currentQuote, maxTextWidth);

    const lineHeight = 68;
    const totalTextHeight = lines.length * lineHeight;
    let startY = (1080 - totalTextHeight) / 2;

    // Photo/name jagah ke liye thoda upar shift karo
    if (photoFile || userName) {
      startY -= 60;
    }

    lines.forEach(function (line, i) {
      ctx.fillText(line, 540, startY + (i * lineHeight));
    });


    // ------------------------------------
    // Photo (circular) + Name
    // ------------------------------------

    const contentBottomY =
      startY + (lines.length * lineHeight) + 60;

    if (photoFile) {

      const photoDataUrl =
        await new Promise(function (resolve, reject) {

          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Photo read नहीं हो पाई।"));

          reader.readAsDataURL(photoFile);
        });

      const img =
        await new Promise(function (resolve, reject) {

          const image = new Image();

          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Photo load नहीं हो पाई।"));

          image.src = photoDataUrl;
        });

      const circleRadius = 70;
      const circleX = 540;
      const circleY = contentBottomY + circleRadius;

      ctx.save();
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Photo ko square crop karke circle mein fit karo
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      ctx.drawImage(
        img,
        sx, sy, size, size,
        circleX - circleRadius, circleY - circleRadius,
        circleRadius * 2, circleRadius * 2
      );

      ctx.restore();

      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (userName) {
        ctx.font = "bold 32px Arial";
        ctx.fillStyle = colors.text;
        ctx.fillText(userName, 540, circleY + circleRadius + 45);
      }

    } else if (userName) {

      ctx.font = "bold 34px Arial";
      ctx.fillStyle = colors.accent;
      ctx.fillText("— " + userName, 540, contentBottomY + 20);
    }


    // ------------------------------------
    // Branding
    // ------------------------------------

    ctx.font = "24px Arial";
    ctx.fillStyle = colors.text;
    ctx.globalAlpha = 0.75;
    ctx.fillText("✨ StatusCraft AI", 540, 1010);
    ctx.globalAlpha = 1;


    // ------------------------------------
    // Result dikhao
    // ------------------------------------

    const imageUrl =
      canvas.toDataURL("image/jpeg", 0.92);

    const resultBox =
      document.getElementById("statusResult");

    const resultImg =
      document.getElementById("generatedStatus");

    if (resultImg) {
      resultImg.src = imageUrl;
    }

    if (resultBox) {
      resultBox.style.display = "block";
    }


    // ------------------------------------
    // Download button
    // ------------------------------------

    const downloadBtn =
      document.getElementById("downloadStatusBtn");

    if (downloadBtn) {

      downloadBtn.onclick = function () {

        const link = document.createElement("a");
        link.download = "StatusCraftAI-Status.jpg";
        link.href = imageUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
      };
    }


    // ------------------------------------
    // Share button
    // ------------------------------------

    const shareBtn =
      document.getElementById("shareStatusBtn");

    if (shareBtn) {

      shareBtn.onclick = async function () {

        try {

          const blobResponse = await fetch(imageUrl);
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

            alert("इस browser में sharing उपलब्ध नहीं है। पहले Download करें।");
          }

        } catch (shareError) {

          if (shareError.name !== "AbortError") {
            alert("❌ Status share नहीं हो पाया।");
          }
        }
      };
    }


  } catch (error) {

    console.error("StatusCraft Generate Error:", error);

    alert(
      "❌ Status बनाने में समस्या हुई:\n\n" + error.message
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "🖼️ Generate Status";
    }
  }
}

window.generateStatus = generateStatus;
