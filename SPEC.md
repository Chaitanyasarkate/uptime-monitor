# Uptime Monitor Specification

## 1. Project Architecture & Monorepo Structure

The project is structured as a monorepo consisting of:
- `/db/init.sql`: Database initialization script for PostgreSQL 16.
- `/backend`: Node 20 runtime using CommonJS (`require`).
- `/frontend`: React 18, bundled with Vite, styled with TailwindCSS.
- `docker-compose.yml`: Root orchestration file for containerizing database, backend, and frontend services.

---

## 2. Dependencies

### Backend Dependencies (Node 20, CommonJS)
- `express`
- `cors`
- `pg`
- `node-cron`
- `axios`
- `dotenv`

*Note: No ORMs (e.g., Prisma, Sequelize) and no TypeScript.*

### Frontend Dependencies (React 18, Vite)
- `react`
- `react-dom`
- `recharts`
- `lucide-react`
- `tailwindcss`
- `postcss`
- `autoprefixer`

*Note: Use native `fetch` for API communication.*

---

## 3. Database Schema (PostgreSQL 16)

### Table: `monitors`
- `id`: `SERIAL PRIMARY KEY`
- `url`: `TEXT UNIQUE NOT NULL`
- `status`: `VARCHAR(10) DEFAULT 'PENDING'`
- `last_checked`: `TIMESTAMP`
- `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

### Table: `ping_logs`
- `id`: `SERIAL PRIMARY KEY`
- `monitor_id`: `INTEGER REFERENCES monitors(id) ON DELETE CASCADE`
- `status_code`: `INTEGER`
- `response_time_ms`: `INTEGER`
- `is_up`: `BOOLEAN`
- `checked_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

---

## 4. API Contract (Port 4000)

All backend endpoints are served on port `4000` under `/api`. Database queries must use raw parameterized `pg` Pool queries.

### `GET /api/monitors`
- **Description**: Returns all monitors with a nested `history` array of `ping_logs` recorded within the last 24 hours.
- **Response Format**:
  ```json
  [
    {
      "id": 1,
      "url": "https://example.com",
      "status": "UP",
      "last_checked": "2026-10-14T12:00:00.000Z",
      "created_at": "2026-10-14T10:00:00.000Z",
      "history": [
        {
          "id": 101,
          "monitor_id": 1,
          "status_code": 200,
          "response_time_ms": 145,
          "is_up": true,
          "checked_at": "2026-10-14T12:00:00.000Z"
        }
      ]
    }
  ]
  ```

### `POST /api/monitors`
- **Description**: Adds a new monitor URL. Auto-prepends `https://` if missing prior to inserting into the database.
- **Request Body**:
  ```json
  {
    "url": "example.com"
  }
  ```
- **Response**: The newly created monitor record.

### `DELETE /api/monitors/:id`
- **Description**: Deletes a monitor by ID (cascades to related `ping_logs`).
- **Response**: Confirmation message or deleted record status.
