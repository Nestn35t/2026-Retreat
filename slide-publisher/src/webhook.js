/**
 * Canva Webhook Handler
 *
 * Listens for design update events from Canva and triggers republishing.
 *
 * Canva sends a POST to your webhook URL when:
 * - A design is updated (design.update)
 * - A design is published (design.publish)
 *
 * Setup: Register your webhook at https://www.canva.com/developers/
 * Webhook URL: {PUBLIC_URL}/webhook/canva
 */

const crypto = require("crypto");

/**
 * Verify Canva webhook signature.
 * Canva signs payloads with HMAC-SHA256 using your webhook secret.
 */
function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Create Express middleware for handling Canva webhooks.
 *
 * @param {Object} options
 * @param {string} options.webhookSecret - Canva webhook signing secret
 * @param {string} options.designId - The design ID we care about
 * @param {Function} options.onDesignUpdate - Callback when the design is updated
 */
function createWebhookHandler({ webhookSecret, designId, onDesignUpdate }) {
  return function webhookHandler(req, res) {
    // Canva sends a verification challenge on initial setup
    if (req.body && req.body.challenge) {
      console.log("[Webhook] Responding to Canva verification challenge");
      return res.json({ challenge: req.body.challenge });
    }

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers["x-canva-signature"];
      const rawBody =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);

      if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
        console.warn("[Webhook] Invalid signature, rejecting");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const event = req.body;
    console.log(`[Webhook] Received event: ${event.type || "unknown"}`);

    // Check if this event is for our design
    const eventDesignId =
      event.data && (event.data.design_id || event.data.designId);

    if (eventDesignId && eventDesignId !== designId) {
      console.log(`[Webhook] Ignoring event for design ${eventDesignId}`);
      return res.json({ status: "ignored" });
    }

    // Trigger republish
    if (
      event.type === "design.update" ||
      event.type === "design.publish" ||
      event.type === "design:completion:update"
    ) {
      console.log(`[Webhook] Design updated! Triggering republish...`);

      // Run async but respond immediately
      onDesignUpdate(eventDesignId || designId).catch((err) => {
        console.error("[Webhook] Republish failed:", err);
      });

      return res.json({ status: "accepted", message: "Republish triggered" });
    }

    res.json({ status: "ok" });
  };
}

module.exports = { createWebhookHandler, verifySignature };
