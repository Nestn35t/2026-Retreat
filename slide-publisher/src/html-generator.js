/**
 * HTML/CSS Generator
 *
 * Converts exported Canva slides into a designed, responsive web page.
 * Each slide becomes a full-width section with its image as a background
 * or inline element, wrapped in clean HTML/CSS.
 */

const fs = require("fs");
const path = require("path");

/**
 * Generate a complete HTML page from slide images.
 *
 * @param {Object} options
 * @param {string} options.title - Page title
 * @param {Array} options.slides - Array of { pageIndex, filePath, url }
 * @param {string} options.templatePath - Optional custom template path
 * @param {string} options.baseUrl - Base URL for assets (e.g., "/slides")
 * @returns {string} Complete HTML string
 */
function generateHTML({ title, slides, templatePath, baseUrl = "/slides" }) {
  // Use custom template if provided
  if (templatePath && fs.existsSync(templatePath)) {
    let template = fs.readFileSync(templatePath, "utf8");
    const slideHtml = slides
      .map(
        (s, i) =>
          `<section class="slide" id="slide-${i + 1}">
        <img src="${baseUrl}/slide-${i + 1}.png" alt="Slide ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}" />
      </section>`
      )
      .join("\n");

    template = template.replace("{{TITLE}}", escapeHtml(title));
    template = template.replace("{{SLIDES}}", slideHtml);
    template = template.replace("{{SLIDE_COUNT}}", String(slides.length));
    template = template.replace("{{GENERATED_AT}}", new Date().toISOString());
    return template;
  }

  // Default built-in template
  const slidesSections = slides
    .map(
      (s, i) => `
    <section class="slide" id="slide-${i + 1}">
      <div class="slide-container">
        <img
          src="${baseUrl}/slide-${i + 1}.png"
          alt="${escapeHtml(title)} - Slide ${i + 1}"
          loading="${i === 0 ? "eager" : "lazy"}"
          draggable="false"
        />
      </div>
      <div class="slide-indicator">${i + 1} / ${slides.length}</div>
    </section>`
    )
    .join("\n");

  const navDots = slides
    .map(
      (_, i) =>
        `<button class="nav-dot${i === 0 ? " active" : ""}" data-slide="${i + 1}" aria-label="Go to slide ${i + 1}"></button>`
    )
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="generator" content="canva-slide-publisher" />
  <meta name="updated-at" content="${new Date().toISOString()}" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      scroll-behavior: smooth;
      scroll-snap-type: y mandatory;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      overflow-x: hidden;
    }

    /* ── Slide sections ── */
    .slide {
      scroll-snap-align: start;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 20px;
    }

    .slide-container {
      max-width: 1200px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .slide-container img {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      transition: transform 0.3s ease;
    }

    .slide-indicator {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 13px;
      color: rgba(255,255,255,0.4);
      letter-spacing: 2px;
    }

    /* ── Side navigation dots ── */
    .nav-dots {
      position: fixed;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 100;
    }

    .nav-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      background: transparent;
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 0;
    }

    .nav-dot:hover, .nav-dot.active {
      background: #fff;
      border-color: #fff;
      transform: scale(1.3);
    }

    /* ── Header bar ── */
    .page-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 200;
      background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
      padding: 16px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      pointer-events: none;
    }

    .page-header h1 {
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.7;
    }

    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #4ade80;
    }

    .live-badge::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    /* ── Keyboard hint ── */
    .keyboard-hint {
      position: fixed;
      bottom: 24px;
      right: 24px;
      font-size: 11px;
      color: rgba(255,255,255,0.3);
      z-index: 100;
    }

    kbd {
      display: inline-block;
      padding: 2px 6px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 3px;
      font-family: inherit;
      font-size: 11px;
    }

    @media (max-width: 768px) {
      .nav-dots { display: none; }
      .keyboard-hint { display: none; }
      .slide { padding: 10px; }
      .slide-container img { border-radius: 4px; }
    }
  </style>
</head>
<body>
  <header class="page-header">
    <h1>${escapeHtml(title)}</h1>
    <span class="live-badge">Live</span>
  </header>

  <nav class="nav-dots" aria-label="Slide navigation">
    ${navDots}
  </nav>

  ${slidesSections}

  <div class="keyboard-hint">
    <kbd>&uarr;</kbd> <kbd>&darr;</kbd> to navigate
  </div>

  <script>
    // Highlight active dot on scroll
    const dots = document.querySelectorAll(".nav-dot");
    const slides = document.querySelectorAll(".slide");

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const num = id.replace("slide-", "");
          dots.forEach(function(d) { d.classList.remove("active"); });
          const active = document.querySelector('.nav-dot[data-slide="' + num + '"]');
          if (active) active.classList.add("active");
        }
      });
    }, { threshold: 0.5 });

    slides.forEach(function(s) { observer.observe(s); });

    // Dot click navigation
    dots.forEach(function(dot) {
      dot.addEventListener("click", function() {
        var target = document.getElementById("slide-" + dot.dataset.slide);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Keyboard navigation
    document.addEventListener("keydown", function(e) {
      var current = document.querySelector(".nav-dot.active");
      var idx = current ? parseInt(current.dataset.slide) : 1;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        var next = document.getElementById("slide-" + (idx + 1));
        if (next) next.scrollIntoView({ behavior: "smooth" });
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        var prev = document.getElementById("slide-" + (idx - 1));
        if (prev) prev.scrollIntoView({ behavior: "smooth" });
      }
    });

    // Auto-refresh: poll for updates every 30 seconds
    (function autoRefresh() {
      var meta = document.querySelector('meta[name="updated-at"]');
      var lastUpdate = meta ? meta.content : "";

      setInterval(function() {
        fetch(window.location.href, { cache: "no-store" })
          .then(function(r) { return r.text(); })
          .then(function(html) {
            var match = html.match(/name="updated-at"\\s+content="([^"]+)"/);
            if (match && match[1] !== lastUpdate) {
              console.log("[LiveSlides] Update detected, reloading...");
              window.location.reload();
            }
          })
          .catch(function() {});
      }, 30000);
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { generateHTML };
