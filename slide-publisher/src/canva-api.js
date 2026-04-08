/**
 * Canva Connect API integration
 *
 * Handles:
 * - Fetching design metadata (title, pages, dimensions)
 * - Exporting slides as PNG/PDF images
 * - Polling export jobs until completion
 *
 * Canva API docs: https://www.canva.dev/docs/connect/
 */

const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.canva.com/rest/v1";

class CanvaAPI {
  constructor({ accessToken }) {
    this.accessToken = accessToken;
  }

  /** Generic authenticated request to Canva API */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Canva API ${res.status}: ${body}`);
    }

    return res.json();
  }

  /** Get design metadata (title, page count, thumbnail) */
  async getDesign(designId) {
    const data = await this.request(`/designs/${designId}`);
    return data.design;
  }

  /**
   * Start an export job for a design.
   * format: "png" | "pdf" | "jpg"
   * pages: array of page indices (0-based), or omit for all pages
   */
  async startExport(designId, { format = "png", pages } = {}) {
    const body = {
      design_id: designId,
      format: { type: format },
    };

    if (pages && pages.length > 0) {
      body.pages = pages;
    }

    const data = await this.request("/exports", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return data.job;
  }

  /** Poll an export job until it completes or fails */
  async waitForExport(jobId, { maxAttempts = 30, intervalMs = 2000 } = {}) {
    for (let i = 0; i < maxAttempts; i++) {
      const data = await this.request(`/exports/${jobId}`);
      const job = data.job;

      if (job.status === "success") {
        return job;
      }

      if (job.status === "failed") {
        throw new Error(`Export job failed: ${JSON.stringify(job.error)}`);
      }

      // Still in progress, wait and retry
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Export job timed out after ${maxAttempts} attempts`);
  }

  /**
   * Export a design and download all page images.
   * Returns array of { pageIndex, filePath, url }
   */
  async exportAndDownload(designId, outputDir, { format = "png" } = {}) {
    // Start export
    const job = await this.startExport(designId, { format });
    console.log(`[Canva] Export job started: ${job.id}`);

    // Wait for completion
    const completed = await this.waitForExport(job.id);
    console.log(`[Canva] Export completed: ${completed.urls.length} page(s)`);

    // Download each exported page
    fs.mkdirSync(outputDir, { recursive: true });
    const results = [];

    for (let i = 0; i < completed.urls.length; i++) {
      const url = completed.urls[i];
      const filePath = path.join(outputDir, `slide-${i + 1}.${format}`);

      const imgRes = await fetch(url);
      const buffer = await imgRes.buffer();
      fs.writeFileSync(filePath, buffer);

      results.push({ pageIndex: i, filePath, url });
      console.log(`[Canva] Downloaded slide ${i + 1} → ${filePath}`);
    }

    return results;
  }
}

module.exports = CanvaAPI;
