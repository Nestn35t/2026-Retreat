# Canva Slide Publisher

Auto-publish Canva slides as a live web page. When you update your Canva design, the published page updates automatically.

## Architecture

```
┌──────────────┐     webhook      ┌──────────────────┐     deploy     ┌────────────┐
│  Canva Slide │ ──────────────▶  │  Publisher Server │ ────────────▶  │  Live Page │
│  (you edit)  │                  │                   │                │  (viewers) │
└──────────────┘                  │  1. Export via API │                └────────────┘
                                  │  2. Generate HTML  │
                                  │  3. Deploy         │
                                  └──────────────────┘
```

## How It Works

1. **Canva Webhook** — Canva sends a POST to `/webhook/canva` whenever you save/publish your design
2. **Export** — The server calls the Canva Connect API to export all slides as PNG images
3. **Generate** — Slides are converted into a responsive HTML page with scroll-snap navigation
4. **Deploy** — The page is deployed locally (Express) or to Vercel/Netlify
5. **Auto-Refresh** — The published page polls for updates every 30s and reloads when changed

## Setup

### 1. Get Canva API Credentials

1. Go to [Canva Developers](https://www.canva.com/developers/) and create an app
2. Enable the **Connect API**
3. Generate an access token
4. Note your design ID from the Canva URL: `canva.com/design/{DESIGN_ID}/edit`

### 2. Configure Environment

```bash
cd slide-publisher
cp .env.example .env
# Edit .env with your Canva credentials
```

### 3. Install & Run

```bash
npm install
npm start
```

### 4. Register Webhook (for auto-updates)

In your Canva app settings, add a webhook URL:
```
https://your-domain.com/webhook/canva
```

For local development, use [ngrok](https://ngrok.com/):
```bash
ngrok http 3001
# Then register the ngrok URL as your webhook
```

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Dashboard with publish status |
| `/published` | GET | The live published page |
| `/webhook/canva` | POST | Canva webhook receiver |
| `/api/publish` | POST | Manually trigger republish |
| `/api/status` | GET | Current publish status (JSON) |

## Deploy Targets

### Local (default)
Pages served by the built-in Express server. Good for development.

### Vercel
Set in `.env`:
```
DEPLOY_TARGET=vercel
VERCEL_TOKEN=your_token
VERCEL_PROJECT_ID=your_project_id
```

### Netlify
Set in `.env`:
```
DEPLOY_TARGET=netlify
NETLIFY_TOKEN=your_token
NETLIFY_SITE_ID=your_site_id
```

## One-Time Build

For CI/CD or static export without running the server:

```bash
npm run build
# Output: public/published/index.html
```

## Custom Templates

Place a custom HTML template in `templates/custom.html` and reference it in the generator. Available placeholders:

- `{{TITLE}}` — Design title
- `{{SLIDES}}` — Generated slide HTML
- `{{SLIDE_COUNT}}` — Number of slides
- `{{GENERATED_AT}}` — ISO timestamp

## Project Structure

```
slide-publisher/
├── src/
│   ├── server.js          # Main Express server
│   ├── canva-api.js        # Canva Connect API client
│   ├── webhook.js          # Webhook handler + signature verification
│   ├── html-generator.js   # Slide → HTML/CSS converter
│   ├── publisher.js        # Deploy to Vercel/Netlify/local
│   └── build.js            # Standalone build script
├── templates/
│   └── custom.html         # Custom HTML template (optional)
├── public/published/       # Generated output (gitignored)
├── .env.example
├── .gitignore
└── package.json
```
