# Imari — Personalised Financial Literacy Learning Platform

## Technical Report — Final Version of the Product

**Author:** Precious Chibundu Mozia · **Supervisor:** Thadee Gatera
**Repository:** https://github.com/Kodedbykenzie/project_defence
**Walkthrough video:** [PLACEHOLDER — VIDEO LINK]
**Date:** 30 October 2026

Imari is a personalised financial-literacy learning platform for university students in Kigali (ALU pilot). It assesses each learner's financial-literacy level, recommends modules for weak competency domains, tracks progress, and issues blockchain-verifiable micro-credentials once competency criteria are met. This report maps the delivered product against the approved proposal, demonstrates its technical functioning, and documents the engineering practices behind it.

---

## 1. Scope Alignment & Feature Validation

Table 1 evaluates the delivered system against the eleven functional requirements (FR1–FR11) approved in the proposal (Table 5).

### Table 1. Planned features vs. implementation

| Planned feature (FR) | Intended purpose | Status | Evidence |
|---|---|---|---|
| FR1 — Register, log in/out, profile (invite-only) | Restrict the pilot to invited students | Completed | `backend/src/routes/auth.ts`, `auth-service.ts`, `auth-service.test.ts`; invite-code flow demonstrated in the walkthrough video |
| FR2 — Diagnostic assessment (15 items, 3 per domain) | Establish each learner's starting level | Completed | `GET/POST /v1/assessment/*`; answers stripped server-side |
| FR3 — Total + domain scoring | Objective basis for placement | Completed (server-side) | `lib/scoring.ts`; `scoring.test.ts` (perfect run = 100; rounding not truncation; empty = 0) |
| FR4 — Rule-based recommendations (threshold 60, weakest-first) | Direct learners to weak areas | Completed (threshold admin-configurable) | `weakDomains` rule + boundary tests (60 exactly is not weak); `PUT /v1/admin/settings/threshold` |
| FR5/FR6 — Modules, lessons, activities, quizzes, resources | Deliver learning content | Completed — 5 seeded modules | `GET /v1/modules/:slug`; admin course editor |
| FR7 — Track completion, quiz results, progress | Prove engagement; gate credentials | Completed (DB trigger) | `0003_triggers.sql` — `completed` only when lessons + activity + passing quiz exist |
| FR8 — Feedback + recommendation relevance ratings | Input for evaluation metrics | Completed | `POST /v1/modules/:slug/feedback`; `recommendations.relevance` |
| FR9 — Admin manages modules, questions, reports | Course ops without DB access | Completed | `/v1/admin/*` (invites, roster, editor, threshold, metrics, audit log) |
| FR10 — Issue/share/verify/revoke micro-credential | Tamper-evident proof of competency | Completed | `ImariCredentialRegistry.sol`; 8 Hardhat tests; live lifecycle proof; public `/verify/:id` |
| FR11 — Record technical events for evaluation | Feed Table 7 metrics (accuracy, latency, errors) | **Partial — instrumentation complete, pilot data pending** | `event_logs`, `v_knowledge_gain`, `v_recommendation_accuracy`, `v_credential_health`; `recommendation_ms`, `duration_ms`, `latency_ms` columns populated at runtime |

**Scope-change justifications.** (1) *Supabase Auth → custom JWT auth:* the proposal allowed "PostgreSQL via Supabase **or a simple backend service**"; own Fastify auth (HS256 access tokens + rotating refresh tokens with stolen-token detection) gives role checks and no vendor lock while Postgres remains the data store. (2) *FR11 partial:* the proposal's own SDLC (§3.2.1) places evaluation **after** development — iteration 3 delivers "credential feature and evaluation logging", which is done; the paired t-test/Wilcoxon analysis requires the ~30-participant pilot, i.e. the study phase. (3) *Google sign-in disabled in dev* (`GOOGLE_CLIENT_ID` optional) — a deployment choice, not a scope cut. (4) *MetaMask not required:* verification is read-only and the backend signs issuance, so no student needs a wallet.

---

## 2. Technical Product Demonstration

### 2.1 Core functionality

The end-to-end flow demonstrated in the walkthrough video is: invite-based registration → onboarding (language EN/FR/RW, text size, consent) → 15-item diagnostic → server-side scoring → threshold recommendations → lessons/activities/quizzes → progress → credential issuance → public verification. Three technical points distinguish the implementation: **(a)** scoring and the recommendation rule run on the server, so the accuracy metric is computed against one implementation and cannot be gamed in the browser; **(b)** credential eligibility is enforced by a database trigger (`credentials_eligibility`), making the competency rule an invariant of the data layer rather than a UI check; **(c)** only `keccak256(credentialId)`, a `contentHash` of the canonical payload `id|learnerId|moduleId|competency|issuedAt`, and a status (None/Valid/Revoked) are written on-chain — names, scores and answers never leave Postgres.

### 2.2 Backend/frontend interaction and data handling

All requests travel as JSON under the `/v1` prefix with `Authorization: Bearer <JWT>`; request bodies are validated with zod schemas mirroring `frontend/src/types/platform.ts`. Errors follow a stable taxonomy: `401` (auth), `409` with a code for business-rule conflicts raised by DB triggers (`INVITE_EXPIRED`, `COMPETENCY_NOT_MET`), `422` for validation, `429` for rate limits, `500` with an `event_logs` row for defects. Sessions use 15-minute access tokens plus opaque refresh tokens stored only as SHA-256 hashes and rotated on every use; reuse of a revoked token revokes all of the user's sessions. Persistence was verified by direct SQL inspection of `credentials` (real `tx_hash`, `block_number`, `status`) after issuance.

### 2.3 Testing with different inputs

| Input / condition | Expected behaviour | Result |
|---|---|---|
| Diagnostic submitted entirely blank | Score 0, no division-by-zero | ✅ pass (`scoring.test.ts`) |
| All answers correct | 100 overall and per domain | ✅ pass |
| Domain score exactly 60 with threshold 60 | Domain **not** weak (boundary is `<`) | ✅ pass (`weakDomains` test) |
| Domain score 59 | Weak, ordered first among recommendations | ✅ pass |
| Missing/garbage JWT on `/v1/me` | `401` | ✅ verified (401) |
| Expired or revoked invite code | `409 INVITE_EXPIRED` / `INVITE_REVOKED`, friendly message | ✅ pass |
| Credential issued before competency met | `409 COMPETENCY_NOT_MET` (trigger refuses) | ✅ pass |
| Duplicate `issue()` on-chain | Reverts `AlreadyIssued` | ✅ pass (Hardhat) |
| `verify()` with a tampered hash | `(Valid, false)` — alteration detected | ✅ pass, live proof |
| `verify()` unknown credential ID | `(None, false)` → "not found" | ✅ pass |
| Revoked credential verified | `revoked`, never "valid" | ✅ pass |
| Chain node stopped during issuance | Credential stays `pending`; UI shows "Confirming…"; no crash | ✅ graceful-degradation path |

### 2.4 Testing strategies

**Strategy 1 — Automated unit and integration testing.** *Why:* the riskiest logic (scoring, threshold rules, auth, the contract) is deterministic, so automated suites give objective, instantly repeatable regression evidence that manual checking cannot. *How:* `cd backend && npm test` (Node test runner with DB-backed integration) and `cd blockchain && npm test` (8 Hardhat tests on a simulated EVM), plus `npm run typecheck` and `npm run lint`. *Results:* backend **97 tests / 19 suites, 0 failures (~3.8 s)**; contract **8/8** (issue, duplicate, tamper-detection, revoke, reinstate, unknown-id, pause, ownership); typecheck clean; lint 0 errors. *Improvement made afterwards:* manual functional testing exposed a session-state bug — after an API logout a stale offline-fallback session kept the UI "signed in" while API calls returned 401. Fixed in `AuthContext.logout` (both sessions now cleared), re-verified with typecheck + lint and a full login/issue/logout pass.

**Strategy 2 — End-to-end functional testing.** *Why:* unit tests cannot prove the four subsystems (frontend → API → Postgres → chain) interoperate; the credential feature spans all four. *How:* `npm run smoke` signs in as the demo student, the credential-eligible student and an admin and exercises every endpoint including credential issuance, then deletes everything it created (safe to re-run); a scripted UI walkthrough (`frontend/scripts/e2e-walkthrough.mjs`) and the manual lifecycle complete the evidence. *Results:* all endpoints pass under both roles; the live chain lifecycle returned `(Valid, true)` for the correct hash, `(Valid, false)` for a tampered hash, `(Revoked, false)` after revocation and `(Valid, true)` after reinstatement, with the DB row carrying a real transaction hash and block number. *Improvement made afterwards:* the same run exposed documentation drift (docs claimed 7 contract tests and a non-existent migration file); all documentation was corrected and now verified against the code.

### 2.4.1 Performance and compatibility

| Dimension | Measurement | Result |
|---|---|---|
| Build | `npm run build` (Vite, production) | 3.07 s; index.html 0.76 kB, CSS 50.29 kB (9.19 gzip), JS 131.74 kB (51.36 gzip) + 948.81 kB (**291.53 kB gzip**) ≈ **353 kB gzip total**; the >500 kB chunk warning is a documented improvement target (code-splitting) |
| API latency (local, n=26) | `avg(assessment_attempts.recommendation_ms)` | **2.0 ms** mean recommendation generation |
| Verification latency (local, n=19) | `avg(credential_verifications.latency_ms)` | **4.7 ms** mean credential verification |
| Automated suites | wall-clock | backend 3.8 s (97 tests); contract 0.5 s (8 tests) |
| Browsers | login + diagnostic pass/fail | Chrome ✅ [PLACEHOLDER — Safari / Firefox results] |
| Devices | viewport + real device | [PLACEHOLDER — emulation / device model + OS] |
| Throttling | 4×/6× CPU + Slow 3G | [PLACEHOLDER — diagnostic submit result] |
| Lighthouse | desktop / mobile | [PLACEHOLDER — scores] |

Degradation behaviour was tested explicitly: stopping the backend yields clear error states rather than a white screen, and stopping the chain leaves credentials `pending` for later re-anchoring (documented fallback in the deployment plan).

---

## 3. Code Quality and Technical Implementation

### 3.1 Structure and modularity

The repository is a four-package monorepo — `frontend/` (React 18 + TypeScript + Vite + Tailwind, 10,414 LOC), `backend/` (Fastify 5, 4,551 LOC), `blockchain/` (Solidity 0.8.24 + Hardhat, 106 LOC), `database/` (6 migrations, 34 tables) — each with its own README. The backend separates HTTP/routes (7 domain modules) from services (`auth-service`, `chain-gateway`), pure helpers (`scoring`, `credential`, `watcher`) and data access (`db.ts`); the frontend separates `pages/`, `components/`, `contexts/` (Auth, Platform, Preferences), `utils/` and `types/`. There are no monolithic scripts: no file mixes transport, business logic and persistence.

### 3.2 OOP and design principles

| Principle | Where it applies |
|---|---|
| Encapsulation | The contract's `Record` mapping is `private` — state can change only through `issue/revoke/reinstate`, so invariants are enforced inside the contract; password/token internals are hidden behind `security.ts` |
| Abstraction | `POST /v1/modules/:slug/credential` hides hashing, transaction submission and retry behind one operation; `verifyLive()` hides a three-tier lookup (API → direct chain → offline) behind one call; a 6-function surface over contract storage |
| Separation of concerns / modularity | Route → service → helper → data-access layering; contexts split by state domain; migrations split into schema/indexes/triggers/RLS/sessions/audit |
| Inheritance vs. composition | The proposal's UML `User → Student/Administrator` maps to a `role` column plus middleware authorization (`self`/`student`/`admin`/`public`) — composition over inheritance, matching the single-table SQL design and avoiding fragile hierarchies |
| Polymorphism | One `Modal` component renders as a bottom sheet below 768 px; verification outcomes are a discriminated union (`valid`/`mismatch`/`revoked`/`not_found`); **`ChainGateway` interface with `EthersChainGateway` (real) and `SimulatedChainGateway` (mock) implementations selected by a runtime factory — routes depend only on the interface, so the chain can be swapped without touching them (dependency inversion; open/closed)** |
| Reusability | Shared UI primitives, `useLearner`/`useNotifications` hooks, zod schemas reused across routes, i18n dictionary, canonical-hash helpers |

### 3.3 Algorithms and technical problem-solving

| Problem | Technique | Why it fits |
|---|---|---|
| Recommendation engine | Single-pass per-domain counting → percentage → threshold `<60` → stable sort ascending (weakest first); O(D + M log M) | The proposal required a deterministic rule model, not ML: transparent, explainable and directly testable against ground truth; boundary behaviour unit-tested |
| Scoring | One pass over answers, integer rounding, empty-domain guard | Correctness proven by tests (overall computed from items, not the mean of domain scores) |
| Tamper-proof credentials | Canonical payload → `keccak256` → `idHash` + `contentHash`; verification is an O(1) comparison against the anchored hash | Verification needs no personal data; any alteration necessarily changes the hash |
| Session security | Opaque refresh tokens (SHA-256 at rest), rotation per use, reuse detection cascades to all sessions | Stateless access tokens plus server-side revocability |
| Race-safe invite redemption | `SELECT … FOR UPDATE` row lock inside one transaction | Two concurrent redemptions of a single-use code cannot both succeed |
| Chain ↔ DB reconciliation | Watcher matches `keccak256(credentials.id)` to the event's indexed `idHash` (O(1)) | DB stays authoritative for data, chain for status |
| Rate limiting & password KDF | Sliding-window limiter (global + stricter auth bucket); scrypt N=16384, r=8 | Brute-force resistance without native dependencies |
| Evaluation metrics | SQL views compute paired pre/post differences, accuracy %, credential health | Analysis-ready with one query after the pilot |

### 3.4 Readability and maintainability

Conventional commit messages (feat/fix/docs/test/chore across 18+ commits), consistent naming (`getX`/`setX`, route-module files named after their domain), zod schemas as the single interface contract shared by validation and documentation (`backend/openapi.yaml`), doc comments on the contract's public surface, and five READMEs plus an integration guide. Secrets are untracked (`.env` gitignored; `.env.example` shipped) and build output is excluded.

---

## 4. Conclusion and limitations

Imari delivers all eleven approved functional requirements except FR11's analysis phase, which awaits the planned pilot: ten are fully implemented and one is instrumented and logging. The strongest technical results are the deterministic, unit-tested recommendation rule, credential eligibility enforced as a database invariant, and an on-chain anchoring layer whose tamper-detection, revocation and reinstatement behaviours were proven live. Testing combines 105 automated tests (97 backend + 8 contract) with end-to-end functional and input-variation testing; recommendation generation averages 2.0 ms and verification 4.7 ms in the local environment.

Honest limitations: the evaluation metrics are instrumented but carry no pilot data yet; the chain demonstrated is a local Hardhat node running the identical contract that targets Sepolia (testnet — no mainnet, tokens or NFTs); browser/device/Lighthouse results are reported in §2.4.1 where marked; and the main JS chunk (291 kB gzip) needs code-splitting before wide mobile rollout. These match the scope limits already stated in the proposal (§3.6).

---

*Report prepared for the capstone submission "Final Version of the Product". Evidence commands and file references are reproducible from the repository README.*
