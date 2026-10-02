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

| Method & path | Role | Notes |
|---|---|---|
| `POST /auth/invites/check` | public | `{ code, email? }` → invite status |
| `POST /auth/register` | public | Requires a valid invite; inserts `users` + `invite_redemptions` in one transaction |
| `POST /auth/login` · `POST /auth/google` | public | Google sign-up also requires an invite |
| `POST /auth/password/forgot` · `/verify` · `/reset` | public | 6-digit code, 15 min, 5 attempts |
| `GET/PUT /me/preferences` | self | language, text size, alerts, onboarding answers |
| `POST /me/cookie-consent` | any | Stores a `cookie_consents` row |
| `GET /assessment/diagnostic` | student | 15 active items, answers stripped |
| `POST /assessment/attempts` | student | Scores server-side, writes `domain_scores` + `recommendations` |
| `GET /modules` · `GET /modules/:slug` | student | Published only; slug routing |
| `POST /modules/:slug/lessons/:i/complete` · `/activity` · `/quiz` | student | Updates `module_progress` / `quiz_attempts` |
| `POST /modules/:slug/credential` | student | Issues when eligible (DB trigger enforces) |
| `GET /verify/:credentialId?hash=` | public | Reads DB + contract; logs `credential_verifications` |
| `GET /notifications` · `POST /notifications/read` | self | Audience-aware, with `unread` flag |
| `POST /admin/invites` · `PATCH /admin/invites/:id` | admin | create / revoke / extend |
| `PUT /admin/modules/:slug` · `POST /admin/modules` | admin | Course editor save |
| `PUT /admin/settings/threshold` | admin | Recommendation threshold |
| `PATCH /admin/credentials/:id` | admin | revoke / reinstate (also calls contract) |
| `GET /admin/metrics` | admin | Reads evaluation views |

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
