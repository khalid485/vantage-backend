# VANTAGE Nexus — Backend API

IP Monitoring & Enforcement Platform for elite creators and agencies.

---

## Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Database**: Supabase (Postgres + Auth + RLS)
- **Search**: Serper (Google Search API)
- **Logging**: Winston (structured JSON)
- **Auth**: Supabase JWT + API key middleware

---

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/your-org/vantage-nexus-backend
cd vantage-nexus-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Fill in:
| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role key |
| `SERPER_API_KEY` | serper.dev → Dashboard |
| `JWT_SECRET` | Any strong random string |

### 3. Set up the database
Run `schema.sql` in your Supabase SQL editor (Dashboard → SQL Editor → New Query).

### 4. Run
```bash
npm run dev     # development (nodemon)
npm start       # production
```

---

## API Reference

### Authentication
All endpoints require a `Bearer` token (Supabase JWT) in the `Authorization` header.

Agency/server-to-server access can use the `x-vantage-key` header instead.

---

### Discovery

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/discovery/scan` | Start a new OSINT scan |
| `GET` | `/api/discovery/scans` | List past scans |
| `GET` | `/api/discovery/violations` | List detected violations |
| `PATCH` | `/api/discovery/violations/:id` | Update violation status (human review) |

**POST /api/discovery/scan**
```json
{
  "query": "your creator name or brand",
  "assetId": "optional-uuid"
}
```
Returns:
```json
{
  "scanId": "uuid",
  "violationCount": 7,
  "violations": [...],
  "impactEstimate": {
    "erosion_monthly": 3150,
    "erosion_annual": 37800
  }
}
```

---

### Cases (DMCA / Enforcement)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/cases` | Create a DMCA draft from a violation |
| `GET` | `/api/cases` | List all cases |
| `GET` | `/api/cases/:id` | Get case + full notice text |
| `PATCH` | `/api/cases/:id/approve` | Human approves draft |
| `PATCH` | `/api/cases/:id/submit` | Mark as filed |

> ⚠️ **No autonomous submissions.** Cases require explicit human approval before status advances.

---

### Assets

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/assets` | List registered assets |
| `POST` | `/api/assets` | Register a new asset |
| `DELETE` | `/api/assets/:id` | Remove an asset |

---

### Reports

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports/dashboard` | Aggregate stats + latest impact |
| `GET` | `/api/reports/audit` | Paginated immutable audit log |

---

## Deploy to Railway / Render / Fly.io

```bash
# Railway
railway init && railway up

# Render — connect repo, set env vars, build command: npm install, start: npm start

# Fly.io
fly launch && fly deploy
```

Set all `.env` variables as secrets in your platform's dashboard.

---

## Security Notes

- All tables have Row Level Security (RLS) enabled
- The audit log has no UPDATE/DELETE policy — it is append-only
- No autonomous enforcement actions — all DMCA submissions are human-gated
- Compliant discovery sources only — no NCII aggregators
- Service role key stays server-side only; never expose to the frontend
