# Backend — API service

A thin TypeScript service between the React client, Postgres/Supabase and the credential contract. Most reads can go straight to Supabase under RLS; the backend owns anything that needs secrets or cross-user logic: scoring, recommendations, invites, credential issuance and verification.

```
backend/
├── README.md       this guide
└── openapi.yaml    request/response contract
```

## Suggested stack

| Concern | Choice |
|---|---|
| Runtime | Node 20, Express or Fastify (or Supabase Edge Functions — same contract) |
| DB | `@supabase/supabase-js` with the service key, or `pg` |
| Auth | Supabase Auth (email + password, Google OAuth); JWT forwarded as `Authorization: Bearer` |
| Chain | `ethers@6` → `ImariCredentialRegistry` on Sepolia |
| Validation | `zod` schemas mirroring `frontend/src/types/platform.ts` |

## Environment

```
DATABASE_URL=postgres://...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...                       # if not using Supabase Auth
GOOGLE_CLIENT_ID=...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
ISSUER_PRIVATE_KEY=0x...
CREDENTIAL_CONTRACT_ADDRESS=0x...
RESET_CODE_PEPPER=...
APP_ORIGIN=https://imari.app
```

## Endpoints (see `openapi.yaml`)

All API routes are mounted under the **`/v1`** prefix (e.g. `GET /v1/modules`). Auth is `Authorization: Bearer <accessToken>` unless marked public.

| Method & path | Role | Description |
|---|---|---|
| `GET /health` | public | Liveness probe — `{ status: "ok", uptime }` |
| `GET /ready` | public | Readiness probe — runs `select 1` against Postgres (503 if degraded) |
| `POST /v1/auth/invites/check` | public | Validate an invite code before registration; `{ code, email? }` → invite status |
| `POST /v1/auth/register` | public | Create account; requires valid invite. Inserts `users` + `invite_redemptions` atomically |
| `POST /v1/auth/login` · `POST /v1/auth/google` | public | Password login / Google OAuth sign-in (Google sign-up also requires an invite) |
| `POST /v1/auth/password/forgot` · `/verify` · `/reset` | public | 6-digit reset code flow — 15 min expiry, max 5 attempts |
| `GET/PUT /v1/me/preferences` | self | Read/update language, text size, alert prefs, onboarding answers |
| `POST /v1/me/cookie-consent` | self | Record the user's cookie-consent choice |
| `GET /v1/assessment/diagnostic` | student | List active diagnostic items (answers stripped server-side) |
| `POST /v1/assessment/attempts` | student | Submit attempt; scored server-side, writes `domain_scores` + `recommendations` |
| `GET /v1/assessment/attempts` | student | History of the caller's previous attempts |
| `GET /v1/modules` · `GET /v1/modules/:slug` | student | Published modules only; slug-based routing |
| `POST /v1/modules/:slug/lessons/:index/complete` | student | Mark a lesson complete; advances `module_progress` |
| `POST /v1/modules/:slug/activity` · `/quiz` | student | Record activity / quiz result in `module_progress` / `quiz_attempts` |
| `POST /v1/modules/:slug/credential` | student | Issue credential when competency criteria met (DB trigger enforces); anchors hash on-chain |
| `POST /v1/modules/:slug/feedback` | student | Rate a module (star rating after completion) |
| `GET /v1/verify/:credentialId?hash=` | public | Verify a credential against DB + contract; logs to `credential_verifications` |
| `GET /v1/notifications` · `POST /v1/notifications/read` | self | Audience-aware notifications with `unread` flag |
| `GET /v1/notifications/unread-count` | self | Badge counter for the UI |
| `GET/POST /v1/admin/invites` · `PATCH /v1/admin/invites/:id` | admin | List / create / revoke / extend invites |
| `GET /v1/admin/students` | admin | Roster with progress summary |
| `POST /v1/admin/modules` · `PUT /v1/admin/modules/:slug` | admin | Course editor — create or save a module |
| `PUT /v1/admin/settings/threshold` | admin | Set the recommendation weak-domain threshold (default 60) |
| `GET /v1/admin/settings` | admin | Current platform settings |
| `GET /v1/admin/credentials` · `PATCH /v1/admin/credentials/:id` | admin | List credentials; revoke / reinstate (DB update + on-chain status change) |
| `GET /v1/admin/metrics` | admin | Evaluation views (accuracy of recommendations) |
| `GET /v1/admin/events` | admin | Audit/event log stream |

### Example

```bash
# Verify a credential (public)
curl "http://localhost:4000/v1/verify/IMR-XXXX-XXXX?hash=0x…"

# Issue a credential (student, after completing module requirements)
curl -X POST http://localhost:4000/v1/modules/budgeting-basics/credential \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"learnerId":"…","learnerName":"…","moduleId":"…","competency":"Budgeting"}'
```

## Recommendation rule (must match the client)

```ts
for each domain d: score[d] = round(correct[d] / total[d] * 100)
weak = domains where score < threshold (default 60)
recommend published modules in weak domains, priority = ascending score
is_correct = module.domain ∈ weak          // ground truth for accuracy metric
```

Source of truth in the prototype: `frontend/src/utils/recommendation.ts`.

## Wiring the React app

The prototype keeps state in `frontend/src/contexts/PlatformContext.tsx` and `frontend/src/contexts/AuthContext.tsx` (localStorage). Replace each action with an API call, keeping signatures:

| Context action | Endpoint |
|---|---|
| `register`, `login`, `loginWithGoogle` | `/auth/*` |
| `checkInvite` | `POST /auth/invites/check` |
| `submitAssessment` | `POST /assessment/attempts` |
| `completeLesson`, `submitActivity`, `submitQuiz` | `/modules/:slug/*` |
| `issueCredential` | `POST /modules/:slug/credential` |
| `createInvite`, `revokeInvite`, `extendInvite` | `/admin/invites` |
| `markRead` | `POST /notifications/read` |
| `savePreferences`, Settings page | `PUT /me/preferences` |

Use Supabase Realtime on `notifications` (filtered by `recipient_id` or audience) to drive the in-app toasts that `useNotificationToasts` already shows.

## Errors

Trigger errors (`P0001`) map to `409 { code: 'INVITE_EXPIRED' }` etc. Validation errors → `422`. Everything else → `500` with an `event_logs` row (`success=false`) for the evaluation defect log.
