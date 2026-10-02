# Imari — project docs

Personalised financial literacy learning for university students in Kigali (ALU pilot). Capstone: *Design, development and evaluation of a personalised financial literacy learning platform* — Precious Chibundu Mozia, supervised by Thadee Gatera.

## Repository map

| Folder | What's inside | Integration guide |
|---|---|---|
| `frontend/` (React app) | Student + admin web client, prototype state in `frontend/src/contexts/` | `docs/integration-guide.md` |
| `database/` | Postgres/Supabase schema, indexes, triggers, RLS, seed | `database/README.md` |
| `backend/` | API contract and wiring guide | `backend/README.md`, `backend/openapi.yaml` |
| `blockchain/` | Solidity credential registry for Sepolia | `blockchain/README.md` |
| `docs/` | This overview and the end-to-end integration guide | — |

This repository is a monorepo: `backend/`, `blockchain/`, `database/` and `docs/` live at the root alongside `frontend/`, which is the npm workspace declared in the root `package.json`.

## Architecture (Figure 3)

```
 React + TS client ──► Backend API ──► PostgreSQL (Supabase)   ← all personal & learning data
        │                   │
        │                   └──► Credential service ──► Sepolia: ImariCredentialRegistry
        └──► /verify (public) ─────────────────────────┘         ← id hash + content hash + status only
```

## Core flow (Figure 2)

1. **Join** with an invite code → cookie consent → preferences (language, text size, interests, goal).
2. **Diagnostic**: 15 items, 3 per domain → domain scores.
3. **Rule**: domains below the threshold (60%) → recommended modules, lowest score first.
4. **Learn**: lessons → practical activity → quiz (pass mark per module).
5. **Credential**: eligible → hash anchored on Sepolia → shareable `/verify/IMR-XXXX-XXXX`.
6. **Post-test** → knowledge gain; relevance rating → evaluation metrics.

## Routes

| Path | Who |
|---|---|
| `/login`, `/register?code=ALU-PILOT`, `/forgot-password` | public |
| `/verify`, `/verify/:credentialId`, `/legal/cookies` | public |
| `/onboarding` | new students |
| `/app`, `/app/assessment`, `/app/results`, `/app/modules`, `/app/modules/:slug`, `/app/progress`, `/app/credentials`, `/app/notifications`, `/app/settings` | students |
| `/admin`, `/admin/modules`, `/admin/modules/new`, `/admin/modules/:slug/edit`, `/admin/assessment`, `/admin/students`, `/admin/invites`, `/admin/credentials`, `/admin/notifications`, `/admin/settings` | admins |

## Demo

Student `aline@alustudent.com` · Admin `admin@imari.rw` · password `demo1234` · invite `ALU-PILOT`.
