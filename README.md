# PulseGuard Uptime Monitor

A modern, production-grade full-stack uptime and keep-alive monitoring platform built with **React 18**, **TailwindCSS**, **Recharts**, **Express (Node 20)**, and **PostgreSQL 16** — fully containerized via **Docker Compose** and deployed as a **single service on Render**.

![PulseGuard Uptime Monitor Dashboard](docs/screenshots/dashboard.png)

🌐 **Live Demo**: [https://uptime-monitor-39c5.onrender.com](https://uptime-monitor-39c5.onrender.com)

---

## Features

- ⚡ **Real-Time Polling & Live Metrics** — Polls latency and health every 15 seconds with dynamic summary metrics (Total, Operational, Downtime).
- 📈 **Interactive Response Time Charts** — Recharts SVG line charts with 24h latency history, custom tooltips, and UP/DOWN color mapping.
- 🔥 **Keep-Alive Cron Mode** — Configurable ping intervals (1, 5, 10, 14 min) to prevent free-tier cloud servers from spinning down.
- ❄️ **Cold-Start Detection** — Automatically marks responses >3000ms as cold starts with a badge in the UI.
- ⚡ **Wake Now Button** — Force an immediate health check on any monitor on demand.
- 🔔 **Anti-Spam Discord Alerts** — Rich Discord embeds sent strictly on state transitions (UP to DOWN), never on repeated steady states.
- 🐳 **One-Command Docker Compose** — Orchestrates PostgreSQL 16 (with healthcheck), Express API, and Vite frontend locally.
- 🚀 **Full-Stack Single Render Deploy** — Multi-stage Docker build compiles React and serves it from Express — one service, one URL.
- 🗜️ **Gzip Compression** — All responses compressed; Vite-hashed assets cached for 1 year in the browser.
- 🤖 **GitHub Actions Heartbeat** — Automated workflow pings the backend every 14 minutes to keep Render awake 24/7.

---

## Architecture & System Flow

```mermaid
flowchart TD
    subgraph Render ["Render Cloud (Single Service)"]
        subgraph Docker ["Multi-Stage Docker Container"]
            Static["Built React Frontend\ndist/ to /app/public"]
            API["Express REST API\nNode 20"]
            Cron["node-cron Engine\nConfigurable Intervals"]
            Worker["Async Health Checker\nAxios, 45s timeout"]
            Notifier["Discord Notifier\nState Transitions Only"]
            Gzip["compression middleware\ngzip all responses"]
        end
        PG[("PostgreSQL 16\nRender Managed DB")]
    end

    subgraph CI ["GitHub Actions"]
        Heartbeat["keep-alive.yml\nevery 14 minutes"]
    end

    Browser["User Browser"]
    Targets["Monitored URLs"]
    Discord["Discord Webhook"]

    Browser -->|"GET / React SPA"| Gzip
    Browser -->|"GET/POST/DELETE /api/*"| API
    Gzip --> Static
    API --> PG
    Cron -->|"Due monitors only"| Worker
    Worker -->|"HTTP GET 45s timeout"| Targets
    Worker -->|"INSERT ping_logs"| PG
    Worker -->|"UP to DOWN only"| Notifier
    Notifier --> Discord
    Heartbeat -->|"GET /api/health"| API
```

---

## Monorepo Project Structure

```text
uptime-monitor/
├── .antigravity                  # Agent architectural rules
├── .dockerignore                 # Root-level Docker ignore
├── .env.example                  # Environment variable template
├── .gitignore
├── .github/
│   └── workflows/
│       └── keep-alive.yml        # GitHub Actions heartbeat (every 14 min)
├── docker-compose.yml            # Local full-stack orchestration
├── SPEC.md                       # System specification & schema
├── README.md
├── docs/
│   └── screenshots/
│       └── dashboard.png
├── db/
│   └── init.sql                  # PostgreSQL DDL schema & indexes
├── scripts/
│   └── migrate.js                # Node.js DB migration runner (no psql needed)
├── backend/
│   ├── Dockerfile                # Multi-stage: builds frontend then serves from Express
│   ├── .dockerignore
│   ├── index.js                  # Express API, cron, gzip, static serving, webhooks
│   ├── package.json              # pg, express, axios, node-cron, compression
│   └── package-lock.json
└── frontend/
    ├── Dockerfile                # Vite dev container (local only)
    ├── .dockerignore
    ├── index.html
    ├── package.json              # react, recharts, lucide-react, tailwindcss
    ├── vite.config.js            # Dev proxy: /api to localhost:4000
    └── src/
        ├── App.jsx               # Dashboard, monitor cards, charts, forms
        ├── index.css             # Tailwind + dark mode styles
        └── main.jsx
```

---

## Quick Start (Docker Compose — Local)

### 1. Clone & Setup
```bash
git clone https://github.com/Chaitanyasarkate/uptime-monitor.git
cd uptime-monitor
cp .env.example .env
```

Optional — add your Discord webhook to `.env`:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### 2. Launch the Full Stack
```bash
docker compose up --build -d
```

### 3. Access Services

| Service | URL |
|---------|-----|
| React Dashboard | http://localhost:5173 |
| Backend API | http://localhost:4000/api/health |
| PostgreSQL | localhost:5432 (db: uptimedb) |

### 4. Stop
```bash
docker compose down -v
```

---

## Local Development (Without Docker)

### Backend
```bash
cd backend
npm install
# Create backend/.env with:
# DATABASE_URL=postgres://postgres:password@localhost:5432/uptimedb
# PORT=4000
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
# /api/* requests are auto-proxied to localhost:4000
```

---

## Cloud Deployment (Render)

### How the Single-Service Deploy Works

The `backend/Dockerfile` uses a **multi-stage build**:
1. **Stage 1** — Installs frontend deps and runs `vite build` → outputs `dist/`
2. **Stage 2** — Installs backend deps and copies `dist/` into `public/`
3. Express serves `public/` as static files at `/`; API routes live at `/api/*`

One Render Web Service handles both the React dashboard and the REST API.

### Deploy Steps

1. **Create a Render PostgreSQL** (New → PostgreSQL → Free plan)
2. **Create a Render Web Service** (New → Web Service → Connect GitHub repo)
   - Environment: **Docker**
   - Dockerfile Path: `backend/Dockerfile`
3. **Add Environment Variables** in Render dashboard:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Internal Database URL from Render PostgreSQL |
   | `DISCORD_WEBHOOK_URL` | *(optional)* Your Discord webhook |

4. **Run DB Migration** after first deploy:
```bash
# From project root (uses backend's pg package)
node scripts/migrate.js "postgres://your-render-db-url"
```

### Keep-Alive GitHub Action

Prevents Render free tier spin-down by pinging the backend every 14 minutes:

```yaml
# .github/workflows/keep-alive.yml
on:
  schedule:
    - cron: '*/14 * * * *'
```

**Setup**: Repo Settings → Secrets → Actions → Add secret:

| Secret | Value |
|--------|-------|
| `BACKEND_URL` | `https://your-service.onrender.com/api/health` |

---

## Performance Optimizations & Production Diagnostics

Following production deployment on Render's free tier, several performance bottlenecks were diagnosed and resolved:

### Root Causes & Solutions

| Bottleneck | Root Cause | Solution Implemented | Impact |
|---|---|---|---|
| **High Bundle Transfer Time** | Raw uncompressed JS/CSS sent over network | Added `compression()` middleware to Express | React JS bundle reduced from **~600KB** raw to **~150KB** gzipped (**4x faster load**) |
| **Repeated Full-Page Asset Downloads** | No HTTP cache headers on static assets | Configured `max-age: 31536000, immutable` for Vite hash chunks, `no-cache` for `index.html` | Repeat visits load instantly from browser cache with 0 network payload |
| **DB Connection Starvation** | `pg.Pool` defaults to 10 connections; Render free PostgreSQL caps at 25 connections total | Constrained pool with `max: 5`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000` | Eliminates connection queueing and prevents hung queries |
| **30-60s Inactive Spin-Down (Cold Starts)** | Render free tier sleeps services after 15 minutes of inactivity | GitHub Actions cron workflow (`.github/workflows/keep-alive.yml`) pings `/api/health` every 14 minutes | Prevents service sleep and keeps the container continuously warm 24/7 |
| **False DOWN Alerts on Cold-Starting Targets** | Monitored targets sleeping on free hosts take 30+ seconds to respond on initial wake | Extended Axios check timeout to **45 seconds** & flagged responses `>3000ms` as cold starts | Eliminates false incident alerts while providing accurate latency diagnostics |

---

## API Reference

Base URL (local): `http://localhost:4000/api`
Base URL (production): `https://uptime-monitor-39c5.onrender.com/api`

### `GET /api/health`
```json
{ "status": "ok" }
```

### `GET /api/monitors`
Returns all monitors with nested 24h ping history.

```json
[
  {
    "id": 1,
    "url": "https://google.com",
    "status": "UP",
    "interval_minutes": 1,
    "is_keep_alive": true,
    "last_checked": "2026-10-15T09:00:00.000Z",
    "created_at": "2026-10-14T17:42:06.323Z",
    "history": [
      {
        "id": 101,
        "monitor_id": 1,
        "status_code": 200,
        "response_time_ms": 623,
        "is_up": true,
        "is_cold_start": false,
        "checked_at": "2026-10-14T17:42:06.958Z"
      }
    ]
  }
]
```

### `POST /api/monitors`
Adds a monitor. Auto-prepends `https://`. Triggers immediate async health check.

**Body**:
```json
{ "url": "myservice.onrender.com", "interval_minutes": 14 }
```

| Field | Type | Required | Allowed |
|-------|------|----------|---------|
| `url` | string | Yes | Any valid URL |
| `interval_minutes` | integer | No (default: 1) | 1, 5, 10, 14 |

**Response `201`**:
```json
{
  "id": 2,
  "url": "https://myservice.onrender.com",
  "status": "PENDING",
  "interval_minutes": 14,
  "is_keep_alive": true,
  "last_checked": null,
  "created_at": "2026-10-15T09:00:00.000Z"
}
```

### `POST /api/monitors/:id/wake`
Forces an immediate health check, bypassing the cron interval.
**Response `200`**: Updated monitor object with latest history.

### `DELETE /api/monitors/:id`
Deletes monitor and cascades to all ping_logs.
**Response `204 No Content`**

---

## Database Schema (PostgreSQL 16)

```sql
CREATE TABLE IF NOT EXISTS monitors (
  id               SERIAL PRIMARY KEY,
  url              TEXT UNIQUE NOT NULL,
  status           VARCHAR(10) DEFAULT 'PENDING',
  interval_minutes INTEGER DEFAULT 1,
  is_keep_alive    BOOLEAN DEFAULT true,
  last_checked     TIMESTAMP,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ping_logs (
  id               SERIAL PRIMARY KEY,
  monitor_id       INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
  status_code      INTEGER,
  response_time_ms INTEGER,
  is_up            BOOLEAN,
  is_cold_start    BOOLEAN DEFAULT false,
  checked_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ping_logs_monitor_time
  ON ping_logs(monitor_id, checked_at DESC);
```

---

## Architectural Decision Records (ADRs)

### ADR 001 — Raw `pg` Queries over ORM
**Decision**: Native `pg` pool with parameterized SQL (`$1, $2`).
**Rationale**: Eliminates ORM cold-start overhead, Prisma engine binaries, and schema migration drift.

### ADR 002 — Native `fetch` on Frontend
**Decision**: `window.fetch` with no HTTP library.
**Rationale**: Zero bundle footprint, no extra dependency vulnerabilities.

### ADR 003 — Async Immediate Ping on Monitor Creation
**Decision**: `checkMonitor()` called immediately after INSERT in `POST /api/monitors`.
**Rationale**: Users see live data within seconds instead of waiting up to 60 seconds.

### ADR 004 — Anti-Spam State Transition Alerts
**Decision**: Discord alerts only fire when `monitor.status !== newStatus` (and not from PENDING).
**Rationale**: Prevents alert flood; only meaningful at incident start/recovery.

### ADR 005 — 15s Polling over WebSockets
**Decision**: `setInterval(fetchMonitors, 15000)` instead of WebSocket connections.
**Rationale**: Simpler architecture, horizontal scaling, automatic reconnect resilience.

### ADR 006 — Multi-Stage Docker Build for Single-Service Deployment
**Decision**: One `backend/Dockerfile` builds React (Stage 1) and serves it from Express (Stage 2).
**Rationale**: Eliminates a separate Render Static Site service — one URL, one deploy, one free-tier slot.

### ADR 007 — Universal Build Context Detection in Dockerfile
**Decision**: `COPY . .` + shell conditional to detect monorepo root vs subfolder build context.
**Rationale**: Render's cloud builder uses root context; local Compose uses `./backend`. One Dockerfile handles both transparently.

### ADR 008 — GitHub Actions Keep-Alive Heartbeat
**Decision**: Scheduled workflow pings `/api/health` every 14 minutes.
**Rationale**: Render free tier spins down after 15 min inactivity. GitHub Actions is free and zero-infrastructure.


### ADR 009 — Multi-Layer Free-Tier Performance Tuning
**Decision**: Introduce `compression` middleware, HTTP cache headers (1-year immutable for hashed assets, `no-cache` for index), and tight connection pool limits (`max: 5`).
**Rationale**: Cloud free tiers impose strict resource limits (RAM, max DB connections, egress speed). Gzip and browser caching drastically decrease load times from ~600KB to ~150KB and prevent DB starvation.

### ADR 010 — Self-Contained Node.js Migration Runner
**Decision**: Added `scripts/migrate.js` utilizing the backend's existing `pg` driver instead of requiring the command-line `psql` client.
**Rationale**: Developers and cloud environments often lack external PostgreSQL binaries on Windows/container runtimes. A pure Node script runs cross-platform anywhere without prerequisite CLI tools.

---

## License
MIT
