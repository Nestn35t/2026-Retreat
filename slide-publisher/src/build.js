/**
 * Standalone build script
 *
 * Use this for CI/CD or one-time builds without running the server.
 * Usage: node src/build.js
 */

require("dotenv").config();

const path = require("path");
const CanvaAPI = require("./canva-api");
const { generateHTML } = require("./html-generator");
const Publisher = require("./publisher");
const fs = require("fs");

const OUTPUT_DIR = path.join(__dirname, "..", "public", "published");
const SLIDES_DIR = path.join(OUTPUT_DIR, "slides");

async function build() {
  const designId = process.env.CANVA_DESIGN_ID;
  if (!designId) {
    console.error("Error: CANVA_DESIGN_ID is required");
    process.exit(1);
  }

  const canva = new CanvaAPI({
    accessToken: process.env.CANVA_ACCESS_TOKEN,
  });

  const publisher = new Publisher({
    target: process.env.DEPLOY_TARGET || "local",
    vercelToken: process.env.VERCEL_TOKEN,
    vercelProjectId: process.env.VERCEL_PROJECT_ID,
  });

  console.log(`Building design: ${designId}\n`);

  // 1. Get design info
  const design = await canva.getDesign(designId);
  console.log(`Title: ${design.title}`);

  // 2. Export slides
  const slides = await canva.exportAndDownload(designId, SLIDES_DIR);

  // 3. Generate HTML
  const html = generateHTML({
    title: design.title,
    slides,
    baseUrl: "./slides",
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html);
  console.log(`\nHTML written to ${OUTPUT_DIR}/index.html`);

  // 4. Deploy
  const result = await publisher.deploy(OUTPUT_DIR);
  console.log(`\nDeployed to: ${result.url}`);
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
