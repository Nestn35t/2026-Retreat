/**
 * Publisher Module
 *
 * Handles deploying generated HTML/assets to various platforms:
 * - Local: Serve from Express (default, good for dev)
 * - Vercel: Deploy via Vercel API
 * - Netlify: Deploy via Netlify API
 */

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

class Publisher {
  constructor({ target = "local", vercelToken, vercelProjectId }) {
    this.target = target;
    this.vercelToken = vercelToken;
    this.vercelProjectId = vercelProjectId;
  }

  /**
   * Deploy the output directory to the configured target.
   * @param {string} outputDir - Directory containing index.html + assets
   * @returns {Object} { url, target, deployedAt }
   */
  async deploy(outputDir) {
    switch (this.target) {
      case "vercel":
        return this.deployToVercel(outputDir);
      case "netlify":
        return this.deployToNetlify(outputDir);
      case "local":
      default:
        return this.deployLocal(outputDir);
    }
  }

  /** Local deployment — files are already in public/, served by Express */
  async deployLocal(outputDir) {
    const indexPath = path.join(outputDir, "index.html");
    if (!fs.existsSync(indexPath)) {
      throw new Error(`No index.html found in ${outputDir}`);
    }

    const publicUrl = process.env.PUBLIC_URL || "http://localhost:3001";
    console.log(`[Publisher] Local deploy ready at ${publicUrl}/published`);

    return {
      url: `${publicUrl}/published`,
      target: "local",
      deployedAt: new Date().toISOString(),
    };
  }

  /** Deploy to Vercel using their REST API */
  async deployToVercel(outputDir) {
    if (!this.vercelToken) {
      throw new Error("VERCEL_TOKEN is required for Vercel deployment");
    }

    // Collect all files in the output directory
    const files = this.collectFiles(outputDir);

    const deployment = {
      name: "canva-slides",
      files: files.map((f) => ({
        file: f.relativePath,
        data: fs.readFileSync(f.absolutePath).toString("base64"),
        encoding: "base64",
      })),
      projectSettings: {
        framework: null,
      },
    };

    if (this.vercelProjectId) {
      deployment.project = this.vercelProjectId;
    }

    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deployment),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Vercel deploy failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const url = `https://${data.url}`;
    console.log(`[Publisher] Vercel deploy complete: ${url}`);

    return {
      url,
      target: "vercel",
      deployedAt: new Date().toISOString(),
      deploymentId: data.id,
    };
  }

  /** Deploy to Netlify using their REST API */
  async deployToNetlify(outputDir) {
    // Netlify deploy via zip upload
    const netlifyToken = process.env.NETLIFY_TOKEN;
    const netlifySiteId = process.env.NETLIFY_SITE_ID;

    if (!netlifyToken) {
      throw new Error("NETLIFY_TOKEN is required for Netlify deployment");
    }

    const files = this.collectFiles(outputDir);
    const crypto = require("crypto");

    // Build file digest map
    const fileDigests = {};
    for (const f of files) {
      const content = fs.readFileSync(f.absolutePath);
      const sha1 = crypto.createHash("sha1").update(content).digest("hex");
      fileDigests[`/${f.relativePath}`] = sha1;
    }

    // Create deploy
    const deployUrl = netlifySiteId
      ? `https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`
      : "https://api.netlify.com/api/v1/sites";

    const deployRes = await fetch(deployUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: fileDigests,
      }),
    });

    if (!deployRes.ok) {
      const body = await deployRes.text();
      throw new Error(`Netlify deploy failed (${deployRes.status}): ${body}`);
    }

    const deploy = await deployRes.json();

    // Upload required files
    for (const filePath of deploy.required || []) {
      const localFile = files.find(
        (f) =>
          fileDigests[`/${f.relativePath}`] ===
          filePath
      );
      if (localFile) {
        await fetch(
          `https://api.netlify.com/api/v1/deploys/${deploy.id}/files/${localFile.relativePath}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${netlifyToken}`,
              "Content-Type": "application/octet-stream",
            },
            body: fs.readFileSync(localFile.absolutePath),
          }
        );
      }
    }

    const url = deploy.ssl_url || deploy.url || `https://${deploy.subdomain}.netlify.app`;
    console.log(`[Publisher] Netlify deploy complete: ${url}`);

    return {
      url,
      target: "netlify",
      deployedAt: new Date().toISOString(),
      deployId: deploy.id,
    };
  }

  /** Recursively collect files from a directory */
  collectFiles(dir, baseDir) {
    baseDir = baseDir || dir;
    const results = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectFiles(fullPath, baseDir));
      } else {
        results.push({
          absolutePath: fullPath,
          relativePath: path.relative(baseDir, fullPath),
        });
      }
    }

    return results;
  }
}

module.exports = Publisher;
