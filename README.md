# User Behavior Analytics

Track page views and clicks on any web page, store them in MongoDB, and explore them in a dashboard (session journeys + click heatmap).

- Live dashboard: `<add your Vercel URL>`
- Live API / demo: `<add your Render URL>/demo/index.html`

## Tech stack

| Layer | Choice |
|---|---|
| Tracker | Vanilla JavaScript (no dependencies), `sendBeacon` with `fetch` fallback |
| Backend | Node.js 18+, Express, Mongoose |
| Database | MongoDB (local Docker or Atlas) |
| Dashboard | Next.js 14 (App Router), React 18, Canvas API for the heatmap |
| Hosting (suggested) | MongoDB Atlas (free), Render (backend), Vercel (dashboard) |

## Project layout

```
tracker/     tracker.js  - drop-in script (page_view, click)
demo/        index.html, about.html - pages with the tracker installed
backend/     Express + Mongoose API (also serves /tracker.js and /demo)
dashboard/   Next.js dashboard (Sessions + Heatmap)
```

## Setup (local)

Requirements: Node.js 18+, and MongoDB (Docker or Atlas).

1. Start MongoDB: `docker compose up -d` (or use an Atlas connection string).
2. Backend:
   ```
   cd backend
   cp .env.example .env      # set MONGODB_URI if not using local Docker
   npm install
   npm start                 # http://localhost:5000
   ```
3. Dashboard:
   ```
   cd dashboard
   cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
   npm install
   npm run dev                  # http://localhost:3000
   ```
4. Generate data: open http://localhost:5000/demo/index.html, click around, then open the About page. Refresh the dashboard.

## Add tracking to any page

```html
<script src="http://localhost:5000/tracker.js"></script>
<!-- different API host: add data-api="https://api.example.com" to the tag -->
```

## Deploy

1. **Database**: create a free MongoDB Atlas cluster, add a database user, allow network access (0.0.0.0/0 for a demo), and copy the connection string.
2. **Backend (Render)**: New > Blueprint, pick this repo (it reads `render.yaml`), set `MONGODB_URI`. You get `https://<name>.onrender.com`; check `/health`.
3. **Dashboard (Vercel)**: import the repo, set Root Directory to `dashboard`, add env var `NEXT_PUBLIC_API_URL=https://<name>.onrender.com`, deploy.
4. The hosted demo is at `https://<name>.onrender.com/demo/index.html` and loads the tracker from the same host.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` | Store one event, an array, or `{events:[...]}` |
| GET | `/api/sessions` | Sessions with `total_events`, `page_views`, `clicks`, first/last seen |
| GET | `/api/sessions/:id/events` | Ordered events for a session |
| GET | `/api/pages` | Tracked pages with view/click counts (heatmap selector) |
| GET | `/api/heatmap?url=<page>` | Click positions for a page |

## Data model

One `events` collection:

```json
{ "session_id": "...", "type": "click", "url": "http://host/demo/index.html?x=1",
  "page": "http://host/demo/index.html", "timestamp": "2026-10-14T10:00:00.000Z",
  "x": 412, "y": 630, "page_w": 1280, "page_h": 1400, "viewport_w": 1280, "viewport_h": 720 }
```
Indexes: `{session_id, timestamp}` for journeys, `{type, page}` for heatmaps.

## Assumptions and trade-offs

- **Session definition**: a session is a browser plus 30 minutes of inactivity. The id is in localStorage, mirrored to a cookie. There is no user identity.
- **Page grouping**: heatmaps group by origin + path; query strings and hashes are ignored (the full `url` is still stored).
- **Click coordinates**: stored as page (document) pixels, not viewport, so scrolling doesn't skew results. The dashboard scales each click by its own recorded page size. Pages whose height changes after load, or very different screen widths, give approximate positions.
- **Heatmap background**: the heatmap draws on a grid, not a screenshot of the page (simple, no cross-origin iframe issues).
- **CORS-friendly sends**: the tracker posts JSON as `text/plain` to avoid preflight so `sendBeacon` works cross-origin; the server parses it as JSON.
- **No authentication**: the API and dashboard are open, and anyone can post events. Fine for a demo; production would need API keys or origin allow-lists, rate limiting, and dashboard login.
- **Scale**: the sessions list uses a live aggregation (capped at 100 by default, 500 max) and heatmaps return at most 20,000 clicks. Larger volumes would need pre-aggregated session documents or time-range filters.
- **Privacy**: no personal data is collected, but IP/consent handling (GDPR/cookie banners) is not implemented.
- **Hosting**: free Render instances sleep after inactivity, so the first request can be slow.
- **Not included**: automated tests against a live MongoDB; scroll, hover and other event types.
