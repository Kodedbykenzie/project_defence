# Database — PostgreSQL / Supabase

The relational source of truth for Imari. Everything sensitive (profiles, answers, scores, progress) lives here; only credential hashes and status go on-chain.

## Layout

```
database/
├── migrations/
│   ├── 0001_schema.sql          types, 27 tables, constraints
│   ├── 0002_indexes.sql         hot-path, partial, GIN and trigram indexes
│   ├── 0003_triggers.sql        slugs, invites, progress, credentials, notifications, audit
│   └── 0004_rls_and_views.sql   Supabase row-level security + evaluation views
└── seed/
    └── 0001_reference_data.sql  domains, institutions, platform settings
```

## Run it

**Supabase CLI**

```bash
supabase init                      # once
cp database/migrations/*.sql supabase/migrations/
supabase db reset                  # applies migrations locally
psql "$SUPABASE_DB_URL" -f database/seed/0001_reference_data.sql
```

**Plain Postgres 15+**

```bash
for f in database/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DATABASE_URL" -f database/seed/0001_reference_data.sql
```

`0004` uses `auth.uid()`. On plain Postgres, create a stub: `create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`

## Tables by requirement

| Requirement | Tables |
|---|---|
| FR1 Accounts & profile | `users`, `student_profiles`, `user_preferences`, `password_reset_codes`, `cookie_consents` |
| Invite-only pilot | `invites`, `invite_redemptions` |
| FR2–FR3 Diagnostic & scoring | `questions` (module_id null), `assessment_attempts`, `attempt_answers`, `domain_scores` |
| FR4 Recommendations | `recommendations` (+ `platform_settings.recommendation.threshold`) |
| FR5–FR6 Content | `domains`, `modules`, `module_objectives`, `lessons`, `activities`, `module_resources` |
| FR7 Progress | `module_progress`, `quiz_attempts` |
| FR8 Feedback | `module_feedback`, `recommendations.relevance` |
| FR9 Admin | `platform_settings`, `audit_log` |
| FR10 Credentials | `credentials`, `credential_verifications` |
| Notifications | `notifications`, `notification_reads` |
| FR11 Evaluation | `event_logs`, views `v_knowledge_gain`, `v_recommendation_accuracy`, `v_credential_health` |

## Triggers

| Trigger | What it guarantees |
|---|---|
| `*_updated_at` | `updated_at` is always current |
| `users_defaults` | Every user gets a preferences row; students get a profile |
| `modules_slug_search` | Unique slug minted once (links never break), full-text vector, `published_at` |
| `invite_redemptions_validate` | Rejects revoked / expired / exhausted / wrong-email codes and increments `uses` atomically (`for update` lock) |
| `module_progress_status` | Status becomes `completed` only when all lessons + activity + passing quiz |
| `quiz_attempts_progress` | Keeps `best_quiz_score` and logs the event |
| `credentials_eligibility` | Can't issue before competency is met |
| `credentials_guard` | Hash, holder and module are immutable; sets `confirmed_at` / `revoked_at` |
| `*_notify` | Same notification events as the app (joins, attempts, credentials, new courses) |
| `audit_*` | Admin changes to modules, questions, invites, credentials, settings are audited |

Errors raised by triggers use SQLSTATE `P0001` with a stable message (`INVITE_EXPIRED`, `COMPETENCY_NOT_MET`, `CREDENTIAL_IMMUTABLE`, …). The backend maps them to HTTP 409/422.

## Slugs

`modules.slug` and `institutions.slug` are URL-safe (`^[a-z0-9]+(-[a-z0-9]+)*$`). The web app routes by slug: `/app/modules/emergency-saving`, `/admin/modules/emergency-saving/edit`. Old id-based links still resolve.

## Frontend mapping

| Frontend (`types/platform.ts`) | Database |
|---|---|
| `Learner.attempts[]` | `assessment_attempts` + `domain_scores` |
| `Learner.progress[moduleId]` | `module_progress` |
| `Learner.preferences` | `user_preferences` |
| `Credential` | `credentials` (`hash`, `txHash`, `block`) |
| `Invite.redeemedBy[]` | `invite_redemptions` joined to `users` |
| `AppNotification.readBy[]` | `notification_reads` |
