# PulseGuard Uptime Monitor

A modern, production-grade full-stack uptime and latency monitoring platform built with **React 18**, **TailwindCSS**, **Recharts**, **Express (Node 20)**, and **PostgreSQL 16**, fully containerized via **Docker Compose**.

![PulseGuard Uptime Monitor Dashboard](docs/screenshots/dashboard.png)

---

## Features

- ⚡ **Real-Time Polling & Live Metrics**: Automatically polls latency and operational health every 15 seconds, rendering dynamic summary metrics (Total, Operational, Downtime).
- 📈 **Interactive Response Time Charts**: Responsive SVG line charts built with Recharts, complete with latency history, custom tooltips, and green (`UP`) / red (`DOWN`) color mapping.
- 🕒 **Background Health-Check Engine**: Scheduled `node-cron` pinger executing every 60 seconds with 8000ms timeout tolerance.
- ⚡ **Instant Initial Health Check**: Newly added monitors trigger an asynchronous initial ping immediately upon insertion, eliminating the 60-second first-point latency.
- 🔔 **Anti-Spam Discord Webhook Alerts**: Sends rich Discord embeds strictly on state transitions (`UP` ⇄ `DOWN`), ignoring repeated steady states or initial `PENDING` records.
- 🛡️ **Defensive API Contract**: Auto-prepends `https://` protocols, rejects duplicate domains, handles cascading deletions, and returns clean error payloads.
- 🐳 **One-Command Docker Compose**: Fully orchestrated PostgreSQL 16 container (with healthcheck bootstrap), Express API, and Vite frontend.

---

## Architecture & System Flow

```mermaid
flowchart TD
    subgraph Client ["Frontend (Port 5173)"]
        UI["React 18 Dashboard<br/>Vite + TailwindCSS"]
        Charts["Recharts SVG Line Graphs<br/>(24h Latency Trends)"]
        Poll["15s Auto Poller<br/>(Native fetch)"]
    end

    subgraph Server ["Backend (Port 4000)"]
        API["Express REST API<br/>(Node 20 CommonJS)"]
        Cron["node-cron Engine<br/>(Every 60s)"]
        Worker["Async Health Checker<br/>(Axios HTTP Pings)"]
        Notifier["Discord Webhook Notifier<br/>(State Transitions Only)"]
    end

    subgraph Storage ["Database (Port 5432)"]
        PG[("PostgreSQL 16<br/>Database: uptimedb")]
        T1["monitors table"]
        T2["ping_logs table<br/>(idx_ping_logs_monitor_time)"]
    end

    subgraph External ["External Services"]
        Targets["Monitored URLs<br/>(e.g., google.com, api.service.io)"]
        Discord["Discord Webhook Channel"]
    end

    UI -->|"GET /api/monitors<br/>POST /api/monitors<br/>DELETE /api/monitors/:id"| API
    Poll -.->|"Auto Sync (15s)"| API
    API -->|"Raw parameterized queries"| PG
    API -->|"Async Trigger (on POST)"| Worker
    Cron -->|"Trigger Check"| Worker
    Worker -->|"HTTP GET (8s Timeout)"| Targets
    Worker -->|"Persist Status & Latency"| PG
    Worker -->|"Transition Alert (UP ⇄ DOWN)"| Notifier
    Notifier -->|"Rich Embed"| Discord
    PG --- T1
    PG --- T2
```

---

## Monorepo Project Structure

```text
uptime-monitor/
├── .antigravity            # Standing agent rules & architectural boundaries
├── .env.example            # Environment variable template
├── .gitignore              # Ignored build artifacts & secrets
├── SPEC.md                 # System specifications & schema definitions
├── docker-compose.yml      # Root multi-container orchestration
├── docs/
│   └── screenshots/
│       └── dashboard.png   # Dashboard UI preview screenshot
├── db/
│   └── init.sql            # PostgreSQL 16 DDL schema & indexes
├── backend/
│   ├── .dockerignore       # Docker build exclusions
│   ├── Dockerfile          # Production Node 20 Alpine container
│   ├── index.js            # Express API, DB pool, cron & webhook alerts
│   ├── package.json        # Dependencies (pg, express, node-cron, axios)
│   └── package-lock.json
└── frontend/
    ├── .dockerignore       # Docker build exclusions
    ├── Dockerfile          # Vite dev container
    ├── index.html          # HTML5 entrypoint
    ├── package.json        # Dependencies (react, recharts, lucide-react)
    ├── postcss.config.js   # PostCSS configuration
    ├── tailwind.config.js  # Tailwind theme definitions
    ├── vite.config.js      # Vite build & port configuration
    └── src/
        ├── App.jsx         # Live dashboard, forms, cards, & Recharts
        ├── index.css       # Tailwind directives & dark-mode styles
        └── main.jsx        # React root mount
```

---

## Quick Start (Docker Compose)

### 1. Clone & Setup Environment
```bash
git clone https://github.com/Chaitanyasarkate/uptime-monitor.git
cd uptime-monitor
cp .env.example .env
```

*(Optional) Configure your Discord webhook inside `.env`:*
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
```

### 2. Launch the Application Stack
```bash
docker compose up --build -d
```

### 3. Access Services
- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **PostgreSQL Database**: `localhost:5432` (`uptimedb`)

### 4. Stop Containers
```bash
docker compose down -v
```

---

## Local Development (Without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running on port `5432`

### 1. Database Setup
```bash
# Execute initialization script against local postgres
psql -U postgres -d uptimedb < db/init.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
# Set environment variables
export DATABASE_URL="postgres://postgres:password@localhost:5432/uptimedb"
export PORT=4000
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:5173
```

---

## API Reference

Base URL: `http://localhost:4000/api`

### 1. Health Check
`GET /api/health`

**Response (`200 OK`)**:
```json
{
  "status": "ok"
}
```

---

### 2. Get All Monitors & 24h History
`GET /api/monitors`

Returns all tracked services ordered by `id DESC` with nested `history` ping logs from the last 24 hours (`checked_at > NOW() - INTERVAL '24 hours'`) ordered by `checked_at ASC`.

**Response (`200 OK`)**:
```json
[
  {
    "id": 1,
    "url": "https://google.com",
    "status": "UP",
    "last_checked": "2026-10-14T17:43:00.805Z",
    "created_at": "2026-10-14T17:42:06.323Z",
    "history": [
      {
        "id": 101,
        "monitor_id": 1,
        "status_code": 200,
        "response_time_ms": 623,
        "is_up": true,
        "checked_at": "2026-10-14T17:42:06.958Z"
      },
      {
        "id": 102,
        "monitor_id": 1,
        "status_code": 200,
        "response_time_ms": 459,
        "is_up": true,
        "checked_at": "2026-10-14T17:43:00.813Z"
      }
    ]
  }
]
```

---

### 3. Add Monitor
`POST /api/monitors`

Inserts a new monitor. Automatically prepends `https://` if protocol scheme is omitted and asynchronously runs an immediate health check.

**Request Body**:
```json
{
  "url": "google.com"
}
```

**Response (`201 Created`)**:
```json
{
  "id": 1,
  "url": "https://google.com",
  "status": "PENDING",
  "last_checked": null,
  "created_at": "2026-10-14T17:42:06.323Z"
}
```

**Duplicate or Invalid Error (`400 Bad Request`)**:
```json
{
  "error": "Monitor for this URL already exists"
}
```

---

### 4. Delete Monitor
`DELETE /api/monitors/:id`

Removes monitor and cascades deletion to all associated `ping_logs`.

**Response (`204 No Content`)**

---

## Database Schema (PostgreSQL 16)

```sql
CREATE TABLE IF NOT EXISTS monitors (
  id SERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  status VARCHAR(10) DEFAULT 'PENDING',
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ping_logs (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
  status_code INTEGER,
  response_time_ms INTEGER,
  is_up BOOLEAN,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ping_logs_monitor_time 
ON ping_logs(monitor_id, checked_at DESC);
```

---

## Architectural Decision Records (ADRs)

### ADR 001: Raw Parameterized `pg` Queries vs. Heavy ORMs
- **Context**: Selecting database abstraction for Node.js backend.
- **Decision**: Used the native `pg` connection pool with raw parameterized SQL queries (`$1, $2`).
- **Rationale**: Completely eliminates ORM cold-start latency, memory overhead, generation steps (e.g., Prisma engine binaries), and schema migration drift, maximizing ping throughput and query transparency.

### ADR 002: Native `fetch` on Frontend
- **Context**: Selecting client-side HTTP communication library.
- **Decision**: Standardized on native browser `window.fetch`.
- **Rationale**: Zero external bundle footprint, seamless compatibility across modern web standards, and prevents redundant dependency rot (e.g. Axios / Axios-wrapper vulnerabilities).

### ADR 003: Asynchronous Initial Ping on Monitor Creation
- **Context**: In traditional cron monitors, newly created targets remain in a blank `'PENDING'` state for up to 60 seconds until the next cron cycle.
- **Decision**: Triggered an asynchronous `checkMonitor(newMonitor)` invocation immediately after database insertion in `POST /api/monitors`.
- **Rationale**: Delivers instant latency feedback and status resolution to the user within milliseconds while keeping the HTTP response fast and non-blocking.

### ADR 004: Anti-Spam State Transition Alerts
- **Context**: Periodic pings every 60 seconds would overwhelm Discord channels if alerts were sent on every check.
- **Decision**: Implemented state transition condition:
  ```javascript
  if (monitor.status !== 'PENDING' && monitor.status !== newStatus) {
    await sendDiscordAlert(monitor.url, newStatus, statusCode, errorMsg);
  }
  ```
- **Rationale**: Ensures notifications fire strictly during incidents (`UP` &rarr; `DOWN`) or recoveries (`DOWN` &rarr; `UP`), filtering out steady states and initial setup noise.

### ADR 005: 15-Second Frontend Polling vs. WebSockets
- **Context**: UI updates for uptime and latency tracking.
- **Decision**: Built with a 15-second `setInterval` HTTP polling model.
- **Rationale**: Minimal architectural complexity, horizontal scaling without stateful socket servers, automatic reconnection resilience, and negligible bandwidth overhead for low-to-medium monitor counts.

---

## License
MIT