# Backend — API service

A thin TypeScript service between the React client, Postgres/Supabase and the credential contract. Most reads can go straight to Supabase under RLS; the backend owns anything that needs secrets or cross-user logic: scoring, recommendations, invites, credential issuance and verification.

```
backend/
├── src/
│   ├── index.ts          bootstrap: config check, Fastify listen, graceful shutdown
│   ├── app.ts            app factory — helmet/CORS/rate-limit + all /v1 routes
│   ├── security.ts       scrypt passwords · JWT HS256 (jose) · reset codes · hashing
│   ├── auth-plugin.ts    parses `Authorization: Bearer` → request auth claims
│   ├── config.ts         zod-validated environment
│   ├── db.ts/errors.ts   pg pool helper · error → HTTP mapping (+ event_logs row)
│   ├── lib/              credential.ts (canonical hashes) · scoring.ts · watcher.ts (chain events)
│   ├── routes/           auth, me, assessment, modules, credentials, notifications, admin
│   └── services/         auth-service.ts · chain-gateway.ts (ethers → registry)
├── scripts/              migrate · seed · smoke-endpoints · e2e-lifecycle
├── test/                 node test-runner suites (api, api-contract, auth-service, scoring, credential-hash)
├── openapi.yaml          request/response contract
└── README.md             this guide
```

## Stack (implemented)

| Concern | Choice |
|---|---|
| Runtime | Node 20 + Fastify 5 (`tsx` in dev, `tsc` build for prod) |
| DB | `pg` against Postgres / Supabase (`DATABASE_URL`) |
| Auth | JWT HS256 via `jose` — 15-min access tokens + rotating opaque refresh tokens (server-side sessions, reuse detection); optional Google ID-token sign-in (`GOOGLE_CLIENT_ID`) |
| Chain | `ethers@6` → `ImariCredentialRegistry` (local Hardhat by default, Sepolia for the pilot) |
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
| `GET /v1/me` | self | The signed-in user with their preferences and student profile |
| `GET/PUT /v1/me/preferences` | self | Read/update language, text size, alert prefs, onboarding answers |
| `POST /v1/me/cookie-consent` | self | Record the user's cookie-consent choice |
| `GET /v1/assessment/diagnostic` | student | List active diagnostic items (answers stripped server-side) |
| `POST /v1/assessment/attempts` | student | Submit attempt; scored server-side, writes `domain_scores` + `recommendations` |
| `GET /v1/assessment/attempts` | student | History of the caller's previous attempts |
| `GET /v1/modules` · `GET /v1/modules/:slug` | student | Published modules only; slug-based routing |
| `POST /v1/modules/:slug/lessons/:index/complete` | student | Mark a lesson complete; advances `module_progress` |
| `POST /v1/modules/:slug/activity` | student | Record the activity response in `module_progress` |
| `POST /v1/modules/:slug/quiz` | student | Record a quiz attempt in `quiz_attempts`; scored server-side and answered with `{ score, passed, correct, total, passingScore, results }` — `results` gives per-question feedback (`questionId`, `correct`, `selected`, `answer`, `explanation`) once the attempt is graded |
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

## Verification

```bash
npm test        # unit + contract tests, no server needed
npm run dev     # terminal 1
npm run smoke   # terminal 2 — every endpoint, both roles, cleans up after itself
```

`npm run smoke` requires a seeded database (`npm run db:setup`). It signs in as
the demo student, the eligible student and an admin, exercises all endpoints
including credential issuance, then deletes the module, invite, account and
credential it created, so it can be run repeatedly. Point it at another host
with `API_ROOT=http://localhost:4100 npm run smoke`.

Seeded accounts (`demo1234` for all):

| Account | Role | Notes |
|---|---|---|
| `admin@imari.rw` | admin | Platform administration |
| `aline@alustudent.com` | student | Demo learner |
| `eligible@alustudent.com` | student | Already meets every competency rule for `borrowing-wisely`, so `POST /modules/borrowing-wisely/credential` returns `201` |

## Errors

Trigger errors (`P0001`) map to `409 { code: 'INVITE_EXPIRED' }` etc. Validation errors → `422`. Everything else → `500` with an `event_logs` row (`success=false`) for the evaluation defect log.
