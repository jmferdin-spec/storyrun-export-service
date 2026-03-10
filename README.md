# StoryRun Export Service

A tiny Express server that handles PNG generation for the StoryRun app.
Runs on Railway (free tier) and is called by the Vercel frontend.

## Why separate?

Vercel's free plan cuts off functions at 10 seconds. Generating a PNG with
a headless browser takes 8–15 seconds. Railway runs a persistent server
with no function timeout — and it's free.

## How it works

```
User taps "Export" in the app (on Vercel)
  → Vercel /api/generate-story receives the request
  → Vercel proxies it to Railway /generate
  → Railway renders the HTML with Puppeteer
  → Railway returns the PNG
  → Vercel forwards the PNG to the user's browser
```

The browser is kept alive between requests (pooled), so after the first
export it's much faster — typically 3–6 seconds.

---

## Deploy to Railway (free)

### Step 1 — Push to GitHub

Create a new GitHub repository for this folder and push:

```bash
cd storyrun-export-service
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/storyrun-export-service.git
git push -u origin main
```

### Step 2 — Create a Railway project

1. Go to https://railway.app and sign in (free, sign in with GitHub)
2. Click **New Project → Deploy from GitHub repo**
3. Select your `storyrun-export-service` repository
4. Railway detects the Dockerfile automatically

### Step 3 — Set environment variables

In Railway → your service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` (your Vercel URL) |
| `API_SECRET` | Any random string, e.g. `openssl rand -hex 32` output |

Railway sets `PORT` automatically — don't set it manually.

### Step 4 — Get your Railway URL

After deploy: Railway → your service → **Settings → Domains → Generate Domain**

You'll get something like `storyrun-export.railway.app`

### Step 5 — Add to Vercel

In your Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `EXPORT_SERVICE_URL` | `https://storyrun-export.railway.app` |
| `EXPORT_SERVICE_SECRET` | Same value as `API_SECRET` in Railway |

Then redeploy the Vercel project (Deployments → Redeploy).

---

## Testing

Once deployed, test the health endpoint:
```
https://storyrun-export.railway.app/health
```

Should return:
```json
{ "status": "ok", "browser": "ready", "uptime": 42, "memory": "180MB" }
```

---

## Railway free tier limits

- **500 hours/month** of run time (enough for ~16 hours/day continuous)
- **512MB RAM** — plenty for one Chromium instance
- **$0/month** as long as you stay under the limits

The service sleeps after inactivity to conserve hours. The first export
after a sleep takes ~8 seconds (browser cold start). Subsequent exports
in the same session are 3–5 seconds.

To prevent sleeping (optional, uses more hours):
Railway → service → Settings → enable "Always On" (requires paid plan)

---

## Local development

```bash
npm install
npm run dev
# Service runs on http://localhost:3001

# Test it:
curl http://localhost:3001/health
```
