-- =====================================================================
-- 0005_auth_sessions.sql — server-side refresh-token sessions
-- Access tokens stay stateless (15 min). Refresh tokens are opaque,
-- stored hashed, rotated on every use; reuse of a revoked token
-- revokes every session for that user (stolen-token detection).
-- =====================================================================
set search_path = imari, public;

create table auth_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  refresh_token_hash char(64) not null unique,        -- sha256 hex of the opaque token
  user_agent         text,
  ip_hash            text,                            -- sha256(ip + pepper), never raw IP
  created_at         timestamptz not null default now(),
  last_used_at       timestamptz not null default now(),
  expires_at         timestamptz not null,
  revoked_at         timestamptz,
  revoked_reason     text                             -- 'rotated' | 'logout' | 'reuse_detected'
);

create index auth_sessions_user_active on auth_sessions (user_id)
  where revoked_at is null and expires_at > now();
