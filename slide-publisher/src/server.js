/**
 * Canva Slide Publisher — Main Server
 *
 * Architecture:
 *   Canva Design ──webhook──▶ /webhook/canva ──▶ export slides ──▶ generate HTML ──▶ deploy
 *                                                                                      │
 *   Browser ◀── GET /published ◀────────────────────────────────────────────────────────┘
 *
 * Endpoints:
 *   GET  /               - Dashboard / status page
 *   GET  /published      - The live published page
 *   GET  /published/*    - Static assets (slide images)
 *   POST /webhook/canva  - Canva webhook receiver
 *   POST /api/publish    - Manual trigger to republish
 *   GET  /api/status     - Current publish status
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const CanvaAPI = require("./canva-api");
const { createWebhookHandler } = require("./webhook");
const { generateHTML } = require("./html-generator");
const Publisher = require("./publisher");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Directories ──
const OUTPUT_DIR = path.join(__dirname, "..", "public", "published");
const SLIDES_DIR = path.join(OUTPUT_DIR, "slides");

// ── Instances ──
const canva = new CanvaAPI({
  accessToken: process.env.CANVA_ACCESS_TOKEN,
});

const publisher = new Publisher({
  target: process.env.DEPLOY_TARGET || "local",
  vercelToken: process.env.VERCEL_TOKEN,
  vercelProjectId: process.env.VERCEL_PROJECT_ID,
});

// ── State ──
let publishStatus = {
  lastPublished: null,
  lastError: null,
  isPublishing: false,
  deployUrl: null,
  slideCount: 0,
};

// ── Middleware ──
app.use(express.json());
app.use("/published", express.static(OUTPUT_DIR));

// ── Core publish pipeline ──
async function publishDesign(designId) {
  if (publishStatus.isPublishing) {
    console.log("[Server] Publish already in progress, skipping");
    return;
  }

  publishStatus.isPublishing = true;
  publishStatus.lastError = null;

  try {
    const id = designId || process.env.CANVA_DESIGN_ID;
    console.log(`\n[Server] ═══ Publishing design ${id} ═══`);

    // 1. Get design metadata
    const design = await canva.getDesign(id);
    console.log(`[Server] Design: "${design.title}" (${design.page_count || "?"} pages)`);

    // 2. Export and download slides
    const slides = await canva.exportAndDownload(id, SLIDES_DIR, {
      format: "png",
    });

    // 3. Generate HTML page
    const html = generateHTML({
      title: design.title || "Published Slides",
      slides,
      baseUrl: "/published/slides",
    });

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html);
    console.log("[Server] HTML generated");

    // 4. Deploy
    const result = await publisher.deploy(OUTPUT_DIR);

    // 5. Update status
    publishStatus = {
      lastPublished: new Date().toISOString(),
      lastError: null,
      isPublishing: false,
      deployUrl: result.url,
      slideCount: slides.length,
      designTitle: design.title,
    };

    console.log(`[Server] ═══ Published successfully ═══`);
    console.log(`[Server] URL: ${result.url}`);
    return result;
  } catch (err) {
    publishStatus.isPublishing = false;
    publishStatus.lastError = err.message;
    console.error("[Server] Publish failed:", err.message);
    throw err;
  }
}

// ── Routes ──

// Dashboard
app.get("/", (req, res) => {
  const statusColor = publishStatus.lastPublished ? "#4ade80" : "#fbbf24";
  const statusText = publishStatus.isPublishing
    ? "Publishing..."
    : publishStatus.lastPublished
    ? "Live"
    : "Not published yet";

  res.send(`<!DOCTYPE html>
<html><head><title>Slide Publisher Dashboard</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #111; color: #eee; padding: 40px; max-width: 600px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; background: rgba(255,255,255,0.05); font-size: 13px; margin-bottom: 24px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; }
  .info { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 16px 0; }
  .info dt { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-top: 12px; }
  .info dd { margin: 4px 0 0 0; font-size: 15px; }
  .info dd:first-of-type { margin-top: 0; }
  a { color: #60a5fa; }
  button { background: #3b82f6; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; margin-top: 16px; }
  button:hover { background: #2563eb; }
  .error { color: #f87171; font-size: 13px; margin-top: 8px; }
</style></head>
<body>
  <h1>Canva Slide Publisher</h1>
  <div class="status"><div class="dot"></div>${statusText}</div>

  <div class="info">
    <dl>
      <dt>Design</dt><dd>${publishStatus.designTitle || process.env.CANVA_DESIGN_ID || "Not configured"}</dd>
      <dt>Slides</dt><dd>${publishStatus.slideCount || 0} pages</dd>
      <dt>Last Published</dt><dd>${publishStatus.lastPublished || "Never"}</dd>
      <dt>Deploy URL</dt><dd>${publishStatus.deployUrl ? `<a href="${publishStatus.deployUrl}" target="_blank">${publishStatus.deployUrl}</a>` : "—"}</dd>
      <dt>Deploy Target</dt><dd>${process.env.DEPLOY_TARGET || "local"}</dd>
    </dl>
    ${publishStatus.lastError ? `<div class="error">Error: ${publishStatus.lastError}</div>` : ""}
  </div>

  <button onclick="publish()">Publish Now</button>
  <script>
    function publish() {
      fetch("/api/publish", { method: "POST" })
        .then(r => r.json())
        .then(d => { alert(d.message || d.error); location.reload(); })
        .catch(e => alert("Failed: " + e.message));
    }
  </script>
</body></html>`);
});

// Webhook endpoint
app.post(
  "/webhook/canva",
  createWebhookHandler({
    webhookSecret: process.env.CANVA_WEBHOOK_SECRET,
    designId: process.env.CANVA_DESIGN_ID,
    onDesignUpdate: publishDesign,
  })
);

// Manual publish trigger
app.post("/api/publish", async (req, res) => {
  try {
    const result = await publishDesign(req.body && req.body.designId);
    res.json({ status: "ok", message: "Published successfully", ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status endpoint
app.get("/api/status", (req, res) => {
  res.json(publishStatus);
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n  ┌─────────────────────────────────────────┐`);
  console.log(`  │  Canva Slide Publisher                   │`);
  console.log(`  │  Dashboard:  http://localhost:${PORT}        │`);
  console.log(`  │  Published:  http://localhost:${PORT}/published │`);
  console.log(`  │  Webhook:    POST /webhook/canva         │`);
  console.log(`  └─────────────────────────────────────────┘\n`);

  // Auto-publish on startup if configured
  if (process.env.CANVA_DESIGN_ID && process.env.CANVA_ACCESS_TOKEN) {
    console.log("[Server] Auto-publishing on startup...");
    publishDesign().catch(() => {});
  }
});
