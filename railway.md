# Imari on Railway — Deployment Guide

This document details all the Railway services required to deploy Imari, the environment variables each service needs, and how they communicate internally.

## 🛤️ Services Overview

You need **3 services** in your Railway project:

| Service | Type | Purpose | Port |
|---|---|---|---|
| `backend` | Node.js API | Fastify API server (`/v1/*` routes) | 4000 |
| `database` | PostgreSQL | PostgreSQL database (Supabase-style) | 5432 |
| `frontend` | Node.js SPA | Vite React single-page application | 5173 |

---

## 📦 Service 1: Backend API

### Configuration

In the Railway dashboard, add a **Node.js service** and name it `backend`. Then set these environment variables:

| Variable | Value | Required |
|---|---|---|
| `DATABASE_URL` | `postgresql://imari_user:${POSTGRES_PASSWORD}@db.railway.internal:5432/imari` | ✅ |
| `JWT_SECRET` | Any 32+ character string (e.g., `openssl rand -hex 32`) | ✅ |
| `PORT` | `4000` | ✅ |
| `HOST` | `0.0.0.0` | ✅ |
| `APP_ORIGIN` | `https://your-frontend.up.railway.app` | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `RESET_CODE_PEPPER` | 8+ character string | ✅ |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | optional |
| `SEPOLIA_RPC_URL` | Sepolia endpoint (if on-chain anchoring) | optional |
| `ISSUER_PRIVATE_KEY` | ECDSA private key (if on-chain anchoring) | optional |
| `CREDENTIAL_CONTRACT_ADDRESS` | Sepolia contract address (if on-chain anchoring) | optional |
| `RATE_LIMIT_MAX` | `600` | optional |
| `AUTH_RATE_LIMIT_MAX` | `10` | optional |

### How to get values

- **`DATABASE_URL`**: After adding the PostgreSQL service, Railway provides this automatically in the "Variables" tab. Format: `postgresql://postgres:password@containers-railway-railway.internal:5432/railway`
- **`POSTGRES_PASSWORD`**: Set when creating the PostgreSQL service
- **`APP_ORIGIN`**: Must match your frontend Railway URL exactly (including https:// and path if any)

### Railway Settings for Backend

- **Build Command**: `npm run build` (from `package.json` — compiles TS to `dist/`)
- **Start Command**: `npm run start` (from `package.json` — `node dist/index.js`)
- **Root Directory**: Leave blank (defaults to repo root)

---

## 📦 Service 2: PostgreSQL Database

### Configuration

In the Railway dashboard, add a **PostgreSQL service**. Railway will automatically:

1. Create a database named `railway` (or you can rename it to `imari`)
2. Provide `POSTGRES_PASSWORD` and `DATABASE_URL` variables
3. Expose port 5432

| Variable | Railway auto-generates | Example |
|---|---|---|
| `POSTGRES_DB` | `railway` (or set to `imari`) | `imari` |
| `POSTGRES_USER` | `postgres` (or custom) | `postgres` |
| `POSTGRES_PASSWORD` | Set by you (or generate) | `rKx9#mP2` |
| `DATABASE_URL` | Auto-generated | `postgresql://postgres:rKx9#mP2@containers-railway-railway.internal:5432/railway` |

### Post-Deploy: Create `imari` Database

Run this in your terminal (or via Railway's "New Terminal"):

```bash
psql $DATABASE_URL -c "CREATE DATABASE imari;"
```

Then run the migrations:

```bash
cd backend
npx tsx scripts/migrate.ts   # or: npm run db:migrate
npx tsx scripts/seed.ts      # or: npm run db:seed
```

This creates all tables, inserts reference data (including the `ALU-PILOT` invite code), and populates demo content.

---

## 📦 Service 3: Frontend (React SPA)

### Configuration

In the Railway dashboard, add a **Node.js service** and name it `frontend`. Then set these environment variables:

| Variable | Value | Required |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.up.railway.app/v1` | ✅ |
| `VITE_CONTRACT_ADDRESS` | Leave empty for simulate mode, or set Sepolia address | optional |
| `VITE_RPC_URL` | Leave empty for simulate mode | optional |

### Railway Settings for Frontend

- **Build Command**: `npm run build` (from `package.json` — Vite builds to `dist/`)
- **Start Command**: `npm run preview` (from `package.json` — serves `dist/` statically)
- **Root Directory**: Leave blank

**Note**: Railway automatically detects the `npm run preview` command from the `package.json` scripts. If it doesn't work, set the start command manually to `npx serve -s dist -l 5173`.

---

## 🔗 Internal Communication Diagram

```mermaid
flowchart LR
    subgraph Railway Project
        direction TB
            B[Browser] -->|HTTPS| FE[frontend:5173]
            FE -->|API calls (JSON)| BE[backend:4000]
            BE -->|SQL queries| DB[(PostgreSQL)]
            BE -->|eth_* JSON-RPC| CHAIN[(Ethereum Sepolia)]
            CHAIN -->|issue/revoke/verify| CR[ImariCredentialRegistry]
    end
```

### Communication Flow

| From | To | Protocol | Purpose |
|---|---|---|---|
| `frontend` | `backend` | HTTPS `/v1/*` | All API requests (auth, modules, credentials, admin) |
| `backend` | PostgreSQL | `postgres` protocol (`pg`) | Read/write user data, invites, credentials, progress |
| `backend` | Ethereum Sepolia | JSON-RPC (via ethers.js) | Anchor credentials on-chain (issue, revoke, verify) |
| `frontend` | Etherscan | HTTPS | View transaction links in verification UI (`/verify/:id`) |
| User | Browser | HTTPS | Access the web app |

### CORS Configuration

The backend CORS middleware is configured in `backend/src/app.ts`:

```typescript
const allowedOrigins = config.APP_ORIGIN.split(',').map((o) => o.trim());
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl, server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (!isProd && origin === 'null') return cb(null, true);
    cb(null, false);
  },
  credentials: true,
});
```

- `APP_ORIGIN` **must** include your frontend's full Railway URL (e.g., `https://imari-frontend.up.railway.app`)
- The frontend `VITE_API_URL` should point to `https://your-backend.up.railway.app/v1`

---

## 🌐 Domains & URLs

| Service | Default Railway URL | Custom Domain |
|---|---|---|
| Backend API | `https://backend.up.railway.app` | e.g., `api.imari.rw` |
| Frontend | `https://frontend.up.railway.app` | e.g., `imari.rw` |
| PostgreSQL | `containers-railway-railway.internal` | Internal only |

### Set `APP_ORIGIN` Correctly

```env
# In backend/.env (Railway variables)
APP_ORIGIN="https://frontend.up.railway.app"
```

This must exactly match the frontend URL, including the protocol (`https://`) and no trailing slash.

### Set `VITE_API_URL` Correctly

```env
# In frontend/.env (Railway variables)
VITE_API_URL="https://backend.up.railway.app/v1"
```

---

## 🛠️ Step-by-Step Railway Setup

### Step 1: Initialize the Project

```bash
git clone https://github.com/Kodedbykenzie/project_defence.git
cd project_defence
```

### Step 2: Add Services in Railway Dashboard

1. **New Project** → "Create new project"
2. **Add PostgreSQL service** → name it `database`
3. **Add Node.js service** → name it `backend`
4. **Add Node.js service** → name it `frontend`

### Step 3: Configure Environment Variables

#### Backend (`backend` service)

Go to "Variables" tab and add:

```env
DATABASE_URL="postgresql://imari_user:your_password@db.railway.internal:5432/imari"
JWT_SECRET="openssl-rand-32-chars"
PORT=4000
HOST=0.0.0.0
APP_ORIGIN="https://your-frontend.up.railway.app"
NODE_ENV=production
RESET_CODE_PEPPER="8-char-minimum"

# Optional - for Sepolia anchoring
SEPOLIA_RPC_URL="https://1rpc.io/sepolia"
ISSUER_PRIVATE_KEY="0xyour-ecdsa-key"
CREDENTIAL_CONTRACT_ADDRESS="0xyour-contract-address"

RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_MAX=10
```

#### Frontend (`frontend` service)

```env
VITE_API_URL="https://your-backend.up.railway.app/v1"
VITE_CONTRACT_ADDRESS=""     # optional
VITE_RPC_URL=""              # optional
```

#### PostgreSQL (`database` service)

- Set a secure `POSTGRES_PASSWORD`
- Railway auto-generates `POSTGRES_DB`, `POSTGRES_USER`, `DATABASE_URL`

### Step 4: Run Migrations & Seed

Open Railway's "Terminal" for the backend service and run:

```bash
cd backend
npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts
```

This creates tables, inserts reference data (including `ALU-PILOT` invite), and sets up **demo content including the admin account**:

- **Admin**: `admin@imari.rw` / `demo1234` (password configurable via `ADMIN_PASSWORD` env var in backend)
- **Student**: `aline@alustudent.com` / `demo1234`

The admin is created by default from backend env vars (`ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`). Override them in the Railway backend service variables or `backend/.env` to customize.

### Step 5: Deploy

Click **"Deploy"** on each service. Railway will:
- Build the backend (`npm run build` → `npm run start`)
- Build the frontend (`npm run build` → `npm run preview`)
- Start all services

### Step 6: Test

Visit your URLs:

```bash
# Health check
open https://your-backend.up.railway.app/health
# Expected: {"status":"ok"}

# App
open https://your-frontend.up.railway.app

# Sign up with demo code
# Use: ALU-PILOT (valid through Feb 28, 2027)
```

---

## 🐛 Troubleshooting Guide

| Problem | Cause | Fix |
|---|---|---|
| `ALU-PILOT` says "expired" | Invite date was in the past | Already fixed in `seed.ts` — expires Feb 28, 2027 |
| CORS error: "Not allowed by Access-Control-Allow-Origin" | `APP_ORIGIN` mismatch | Set `APP_ORIGIN` in backend to exact frontend URL |
| `DATABASE_URL` not recognized | Wrong format | Use Railway-provided URL from PostgreSQL service variables |
| Build fails: `tsc` not found | Wrong Node version | Ensure Node 20 LTS; Railway auto-installs correct version |
| Sepolia chain anchoring fails | Missing chain vars | Set `SEPOLIA_RPC_URL`, `ISSUER_PRIVATE_KEY`, `CREDENTIAL_CONTRACT_ADDRESS` |
| 502 Bad Gateway | Service not listening | Check `START_COMMAND`; should be `npm run start` |
| Frontend white screen | Build failed | Check Railway build logs; ensure `npm run build` succeeds |

---

## 📝 References

| Link | Description |
|---|---|
| [`backend/src/config.ts`](backend/src/config.ts) | Environment variable validation with Zod |
| [`backend/src/app.ts`](backend/src/app.ts) | Fastify app factory with CORS, helmet, rate limiting |
| [`frontend/vite.config.ts`](frontend/vite.config.ts) | Vite config with `VITE_API_URL` env var |
| [`frontend/src/contexts/PlatformContext.tsx`](frontend/src/contexts/PlatformContext.tsx) | Invite validation logic (`checkInvite`/`checkAgainst`) |
| [`frontend/src/utils/invite.ts`](frontend/src/utils/invite.ts) | `inviteStatus()` — checks expiration, maxUses, revoked |
| [`database/migrations/0001_schema.sql`](database/migrations/0001_schema.sql) | Full PostgreSQL schema |
| [`openapi.yaml`](backend/openapi.yaml) | Full API contract for all `/v1/*` routes |
| [`blockchain/`](blockchain/) | Hardhat project for Sepolia anchoring |

---

## 📦 Quick Reference: All Env Vars

### Backend (`backend/.env`)

```
# Required
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://...
JWT_SECRET=32-plus-chars
APP_ORIGIN=https://your-frontend.up.railway.app
RESET_CODE_PEPPER=8-chars-minimum

# Optional (chain anchoring)
SEPOLIA_RPC_URL=https://1rpc.io/sepolia
ISSUER_PRIVATE_KEY=0xyour-key
CREDENTIAL_CONTRACT_ADDRESS=0xyour-contract

# Rate limiting
RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_MAX=10
```

### Frontend (`frontend/.env`)

```
# Required
VITE_API_URL=https://your-backend.up.railway.app/v1

# Optional (chain verification)
VITE_CONTRACT_ADDRESS=
VITE_RPC_URL=
```

### PostgreSQL (`database` service, auto by Railway)

```
POSTGRES_DB=imari     # or leave as railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://postgres:password@...
```

---

## ✅ Post-Deploy Checklist

- [ ] `https://backend.up.railway.app/health` returns `{"status":"ok"}`
- [ ] `https://frontend.up.railway.app` loads without errors
- [ ] Sign-up with `ALU-PILOT` works (invite valid through Feb 2027)
- [ ] `/verify/:credentialId` displays valid/revoked/mismatch/not_found outcomes
- [ ] CORS no errors in browser dev tools
- [ ] PostgreSQL migrations ran successfully (tables created)
- [ ] Demo accounts work: `aline@alustudent.com` / `admin@imari.rw`
- [ ] Sepolia anchoring: optional — check if `chainMode: sepolia` in backend logs

---

*This guide is compatible with the current codebase state (November 2026), with the `ALU-PILOT` invite expiration extended to `2027-02-28` in `frontend/src/data/seed.ts`*