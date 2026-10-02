# Imari — personalised financial literacy learning platform

Monorepo for the Imari capstone project: *Design, development and evaluation of a personalised financial literacy learning platform* — Precious Chibundu Mozia, supervised by Thadee Gatera. Pilot: university students in Kigali (ALU).

## Repository layout

| Folder | What's inside |
|---|---|
| `frontend/` | React + TypeScript + Vite + Tailwind web client (student & admin), prototype state in `src/contexts/` |
| `backend/` | API contract and wiring guide (TypeScript service between client, Postgres and the credential contract) |
| `database/` | Postgres/Supabase schema, indexes, triggers, RLS policies and seed data |
| `blockchain/` | Solidity micro-credential registry for Ethereum Sepolia |
| `docs/` | Project overview and end-to-end integration guide |

## Quickstart (frontend)

```bash
npm install        # installs the frontend workspace
npm run dev        # vite dev server
npm run build      # production build
npm run lint       # eslint
```

## Full stack

Each package ships its own guide — start at [`docs/README.md`](docs/README.md), then follow the end-to-end [`docs/integration-guide.md`](docs/integration-guide.md):

1. **Database** — apply `database/migrations/*.sql` in order, then `database/seed/0001_reference_data.sql` (see `database/README.md`).
2. **Blockchain** — deploy `blockchain/contracts/ImariCredentialRegistry.sol` to Sepolia (see `blockchain/README.md`).
3. **Backend** — implement the endpoints in `backend/openapi.yaml` (see `backend/README.md`).
4. **Frontend** — swap localStorage contexts for API calls per `docs/integration-guide.md`.

## Architecture

```
 React + TS client ──► Backend API ──► PostgreSQL (Supabase)   ← all personal & learning data
        │                   │
        │                   └──► Credential service ──► Sepolia: ImariCredentialRegistry
        └──► /verify (public) ─────────────────────────┘         ← id hash + content hash + status only
```

## Demo

Student `aline@alustudent.com` · Admin `admin@imari.rw` · password `demo1234` · invite `ALU-PILOT`.
