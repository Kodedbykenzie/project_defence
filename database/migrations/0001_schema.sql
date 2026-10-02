-- =====================================================================
-- Imari · Personalised financial literacy platform
-- 0001_schema.sql — types, tables and constraints (PostgreSQL 15+ / Supabase)
-- Maps to FR1–FR11 and the ERD in the proposal (Figure 4).
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid(), digest()
create extension if not exists "citext";     -- case-insensitive emails
create extension if not exists "pg_trgm";    -- fuzzy search on names/titles

create schema if not exists imari;
set search_path = imari, public;

-- ---------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------
create type user_role           as enum ('student', 'admin', 'verifier');
create type auth_provider       as enum ('password', 'google');
create type lang_code           as enum ('en', 'rw', 'fr');
create type text_size           as enum ('sm', 'md', 'lg');
create type attempt_kind        as enum ('pre', 'post');
create type progress_status     as enum ('not_started', 'in_progress', 'completed');
create type credential_status   as enum ('pending', 'valid', 'revoked');
create type verification_result as enum ('valid', 'revoked', 'mismatch', 'not_found');
create type notification_kind   as enum ('credential', 'invite', 'student', 'assessment', 'course', 'system');
create type notification_audience as enum ('user', 'admins', 'students');
create type digest_frequency    as enum ('off', 'daily', 'weekly');

-- ---------------------------------------------------------------------
-- Institutions & people (FR1)
-- ---------------------------------------------------------------------
create table institutions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  country     char(2) not null default 'RW',
  city        text default 'Kigali',
  created_at  timestamptz not null default now()
);

create table users (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  password_hash   text,                                    -- null for Google-only accounts
  provider        auth_provider not null default 'password',
  role            user_role not null default 'student',
  full_name       text not null check (char_length(full_name) between 2 and 120),
  avatar_url      text,
  email_verified_at timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,                             -- soft delete (right to erasure queue)
  constraint password_required check (provider = 'google' or password_hash is not null)
);

create table student_profiles (
  user_id            uuid primary key references users(id) on delete cascade,
  institution_id     uuid references institutions(id) on delete set null,
  programme          text,
  year_of_study      smallint check (year_of_study between 1 and 8),
  research_consent   boolean not null default false,
  consent_version    text,
  consent_given_at   timestamptz,
  consent_withdrawn_at timestamptz,
  onboarded_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Onboarding answers + display settings (drives curation & UI)
create table user_preferences (
  user_id          uuid primary key references users(id) on delete cascade,
  language         lang_code not null default 'en',
  text_size        text_size not null default 'md',
  reduce_motion    boolean not null default false,
  rail_open        boolean not null default true,
  interests        text[] not null default '{}',          -- domain ids
  goal             text,
  weekly_time      text,
  learning_style   text,
  toasts_enabled   boolean not null default true,
  muted_kinds      notification_kind[] not null default '{}',
  email_digest     digest_frequency not null default 'weekly',
  updated_at       timestamptz not null default now()
);

create table password_reset_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  code_hash   text not null,                               -- sha256(code || pepper)
  expires_at  timestamptz not null default now() + interval '15 minutes',
  attempts    smallint not null default 0 check (attempts <= 5),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table cookie_consents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  anonymous_id    text,                                    -- device id before sign-in
  analytics       boolean not null default false,
  preferences     boolean not null default false,
  policy_version  text not null,
  ip_hash         text,
  user_agent      text,
  created_at      timestamptz not null default now(),
  constraint consent_owner check (user_id is not null or anonymous_id is not null)
);

-- ---------------------------------------------------------------------
-- Invites (invite-only pilot)
-- ---------------------------------------------------------------------
create table invites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9]+-[A-Z0-9]{4,}$'),
  email       citext,                                      -- set = single-person invite
  note        text,
  max_uses    integer check (max_uses is null or max_uses > 0),
  uses        integer not null default 0 check (uses >= 0),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint uses_within_limit check (max_uses is null or uses <= max_uses),
  constraint personal_invite_single_use check (email is null or max_uses = 1)
);

create table invite_redemptions (
  id          uuid primary key default gen_random_uuid(),
  invite_id   uuid not null references invites(id) on delete cascade,
  user_id     uuid not null unique references users(id) on delete cascade,  -- one code per account
  redeemed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Content: domains, modules, lessons, questions (FR5, FR6, FR9)
-- ---------------------------------------------------------------------
create table domains (
  id          text primary key check (id ~ '^[a-z]+$'),   -- budgeting, saving, debt, investing, digital
  name        text not null,
  code        char(2) not null unique,
  description text,
  sort_order  smallint not null default 0
);

create table modules (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  domain_id      text not null references domains(id),
  title          text not null check (char_length(title) between 3 and 120),
  competency     text not null,
  summary        text,
  minutes        smallint not null default 10 check (minutes between 1 and 180),
  passing_score  smallint not null default 67 check (passing_score between 1 and 100),
  published      boolean not null default false,
  is_starter     boolean not null default false,             -- suggested during onboarding
  published_at   timestamptz,
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  search         tsvector
);

create table module_objectives (
  module_id  uuid not null references modules(id) on delete cascade,
  position   smallint not null,
  text       text not null,
  primary key (module_id, position)
);

create table lessons (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references modules(id) on delete cascade,
  position    smallint not null,
  title       text not null,
  paragraphs  text[] not null default '{}',               -- rich text: **bold** markers
  example     text,                                        -- Rwandan real-life example
  unique (module_id, position) deferrable initially deferred
);

create table activities (
  module_id  uuid primary key references modules(id) on delete cascade,
  title      text not null,
  prompt     text not null
);

create table module_resources (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references modules(id) on delete cascade,
  title      text not null,
  source     text,
  url        text not null check (url ~ '^https?://')
);

-- module_id null  => diagnostic / post-test item
-- module_id set   => module competency quiz item
create table questions (
  id            uuid primary key default gen_random_uuid(),
  domain_id     text not null references domains(id),
  module_id     uuid references modules(id) on delete cascade,
  prompt        text not null,
  options       jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  answer_index  smallint not null check (answer_index >= 0),
  explanation   text,
  position      smallint not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint answer_in_range check (answer_index < jsonb_array_length(options))
);

create table platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Assessment, scoring & recommendations (FR2, FR3, FR4)
-- ---------------------------------------------------------------------
create table assessment_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  kind               attempt_kind not null,
  total_score        smallint check (total_score between 0 and 100),
  threshold_used     smallint not null default 60,
  duration_ms        integer check (duration_ms >= 0),
  recommendation_ms  numeric(10,2),                          -- technical performance metric
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);

create table attempt_answers (
  attempt_id      uuid not null references assessment_attempts(id) on delete cascade,
  question_id     uuid not null references questions(id),
  selected_index  smallint not null,
  is_correct      boolean not null,
  primary key (attempt_id, question_id)
);

create table domain_scores (
  attempt_id  uuid not null references assessment_attempts(id) on delete cascade,
  domain_id   text not null references domains(id),
  correct     smallint not null default 0,
  total       smallint not null default 0 check (total >= 0),
  score       smallint generated always as (case when total = 0 then 0 else round(correct * 100.0 / total)::smallint end) stored,
  primary key (attempt_id, domain_id)
);

create table recommendations (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references assessment_attempts(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  module_id    uuid not null references modules(id) on delete cascade,
  domain_id    text not null references domains(id),
  priority     smallint not null check (priority >= 1),
  domain_score smallint not null,
  threshold    smallint not null,
  reason       text not null,
  is_correct   boolean,                                      -- vs. ground-truth rule (accuracy metric)
  relevance    smallint check (relevance between 1 and 5),   -- Likert rating (FR8)
  created_at   timestamptz not null default now(),
  unique (attempt_id, module_id)
);

-- ---------------------------------------------------------------------
-- Learning progress & quizzes (FR7)
-- ---------------------------------------------------------------------
create table module_progress (
  user_id            uuid not null references users(id) on delete cascade,
  module_id          uuid not null references modules(id) on delete cascade,
  status             progress_status not null default 'in_progress',
  lessons_done       smallint[] not null default '{}',
  activity_response  text,
  best_quiz_score    smallint check (best_quiz_score between 0 and 100),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  module_id   uuid not null references modules(id) on delete cascade,
  answers     smallint[] not null,
  score       smallint not null check (score between 0 and 100),
  passed      boolean not null,
  created_at  timestamptz not null default now()
);

create table module_feedback (
  user_id     uuid not null references users(id) on delete cascade,
  module_id   uuid not null references modules(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  primary key (user_id, module_id)
);

-- ---------------------------------------------------------------------
-- Micro-credentials & verification (FR10) — only hash/status go on-chain
-- ---------------------------------------------------------------------
create table credentials (
  id              text primary key check (id ~ '^IMR-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  user_id         uuid not null references users(id) on delete restrict,
  module_id       uuid not null references modules(id) on delete restrict,
  competency      text not null,
  holder_name     text not null,                             -- snapshot at issuance
  hash            char(66) not null unique check (hash ~ '^0x[0-9a-f]{64}$'),
  chain_id        integer not null default 11155111,         -- Ethereum Sepolia
  contract_address char(42),
  tx_hash         char(66) check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  block_number    bigint,
  status          credential_status not null default 'pending',
  issued_by       uuid references users(id) on delete set null,
  issued_at       timestamptz not null default now(),
  confirmed_at    timestamptz,
  revoked_at      timestamptz,
  revoked_reason  text,
  unique (user_id, module_id)
);

create table credential_verifications (
  id             bigint generated always as identity primary key,
  credential_id  text references credentials(id) on delete set null,
  presented_id   text not null,
  presented_hash text,
  result         verification_result not null,
  latency_ms     integer,
  ip_hash        text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  audience    notification_audience not null default 'user',
  recipient_id uuid references users(id) on delete cascade,
  kind        notification_kind not null,
  title       text not null,
  body        text,
  link        text,
  created_at  timestamptz not null default now(),
  constraint recipient_matches_audience check ((audience = 'user') = (recipient_id is not null))
);

create table notification_reads (
  notification_id uuid not null references notifications(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- ---------------------------------------------------------------------
-- Evaluation & audit (FR11)
-- ---------------------------------------------------------------------
create table event_logs (
  id           bigint generated always as identity primary key,
  user_id      uuid references users(id) on delete set null,
  event        text not null,                                -- e.g. 'assessment.completed'
  success      boolean not null default true,
  duration_ms  integer,
  props        jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create table audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references users(id) on delete set null,
  table_name  text not null,
  row_id      text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  diff        jsonb,
  created_at  timestamptz not null default now()
);
