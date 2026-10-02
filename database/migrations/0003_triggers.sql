-- =====================================================================
-- 0003_triggers.sql — functions & triggers
-- Business rules enforced in the database so every client (web, admin,
-- backend jobs) gets identical behaviour.
-- =====================================================================
set search_path = imari, public;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- unaccent may not be installed; strip common accents by hand
create or replace function unaccent_safe(input text) returns text language plpgsql immutable as $
begin
  return translate(input, 'àáâäãåèéêëìíîïòóôöõùúûüçñÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÇÑ', 'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN');
end $;

create or replace function slugify(input text) returns text language sql immutable as $
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(unaccent_safe(input)), '[^a-z0-9]+', '-', 'g')), ''), 'item')
$;

create trigger users_updated_at            before update on users            for each row execute function set_updated_at();
create trigger student_profiles_updated_at before update on student_profiles for each row execute function set_updated_at();
create trigger user_preferences_updated_at before update on user_preferences for each row execute function set_updated_at();
create trigger modules_updated_at          before update on modules          for each row execute function set_updated_at();
create trigger questions_updated_at        before update on questions        for each row execute function set_updated_at();
create trigger progress_updated_at         before update on module_progress  for each row execute function set_updated_at();
create trigger settings_updated_at         before update on platform_settings for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Users: default preferences row on sign-up
-- ---------------------------------------------------------------------
create or replace function create_user_defaults() returns trigger language plpgsql as $$
begin
  insert into user_preferences (user_id) values (new.id) on conflict do nothing;
  if new.role = 'student' then
    insert into student_profiles (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

create trigger users_defaults after insert on users for each row execute function create_user_defaults();

-- ---------------------------------------------------------------------
-- Modules: stable unique slug, search vector, publish timestamp
-- ---------------------------------------------------------------------
create or replace function modules_before_write() returns trigger language plpgsql as $$
declare
  base text;
  candidate text;
  n int := 2;
begin
  -- Slug is minted once; later title edits keep old links working.
  if new.slug is null or new.slug = '' then
    base := slugify(new.title);
    candidate := base;
    while exists (select 1 from modules where slug = candidate and id <> new.id) loop
      candidate := base || '-' || n;
      n := n + 1;
    end loop;
    new.slug := candidate;
  end if;

  new.search :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.competency, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.summary, '')), 'C');

  if new.published and (tg_op = 'INSERT' or not old.published) then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger modules_slug_search before insert or update of title, competency, summary, published, slug
  on modules for each row execute function modules_before_write();

-- Institutions get slugs too
create or replace function institutions_slug() returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then new.slug := slugify(new.name); end if;
  return new;
end $$;
create trigger institutions_slug_trg before insert on institutions for each row execute function institutions_slug();

-- ---------------------------------------------------------------------
-- Invites: validate + count redemptions atomically
-- ---------------------------------------------------------------------
create or replace function redeem_invite() returns trigger language plpgsql as $$
declare
  inv invites%rowtype;
  user_email citext;
begin
  select * into inv from invites where id = new.invite_id for update;
  if inv.revoked_at is not null then raise exception 'INVITE_REVOKED' using errcode = 'P0001'; end if;
  if inv.expires_at < now() then raise exception 'INVITE_EXPIRED' using errcode = 'P0001'; end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then raise exception 'INVITE_USED' using errcode = 'P0001'; end if;
  if inv.email is not null then
    select email into user_email from users where id = new.user_id;
    if user_email <> inv.email then raise exception 'INVITE_EMAIL_MISMATCH' using errcode = 'P0001'; end if;
  end if;
  update invites set uses = uses + 1 where id = inv.id;
  return new;
end $$;

create trigger invite_redemptions_validate before insert on invite_redemptions for each row execute function redeem_invite();

-- ---------------------------------------------------------------------
-- Progress: derive status from lessons + activity + best quiz
-- ---------------------------------------------------------------------
create or replace function progress_derive_status() returns trigger language plpgsql as $$
declare
  lesson_count int;
  pass_mark int;
begin
  select count(*) into lesson_count from lessons where module_id = new.module_id;
  select passing_score into pass_mark from modules where id = new.module_id;
  if coalesce(array_length(new.lessons_done, 1), 0) >= lesson_count
     and new.activity_response is not null
     and coalesce(new.best_quiz_score, 0) >= pass_mark then
    new.status := 'completed';
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status = 'not_started' and (coalesce(array_length(new.lessons_done, 1), 0) > 0 or new.activity_response is not null) then
    new.status := 'in_progress';
  end if;
  return new;
end $$;

create trigger module_progress_status before insert or update on module_progress for each row execute function progress_derive_status();

-- Quiz attempts roll the best score into progress
create or replace function quiz_update_progress() returns trigger language plpgsql as $$
begin
  insert into module_progress (user_id, module_id, best_quiz_score)
  values (new.user_id, new.module_id, new.score)
  on conflict (user_id, module_id) do update
    set best_quiz_score = greatest(coalesce(module_progress.best_quiz_score, 0), excluded.best_quiz_score);
  insert into event_logs (user_id, event, success, props)
  values (new.user_id, 'quiz.submitted', true, jsonb_build_object('module_id', new.module_id, 'score', new.score, 'passed', new.passed));
  return new;
end $$;

create trigger quiz_attempts_progress after insert on quiz_attempts for each row execute function quiz_update_progress();

-- ---------------------------------------------------------------------
-- Credentials: eligibility gate, immutability, revocation bookkeeping
-- ---------------------------------------------------------------------
create or replace function credentials_before_insert() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from module_progress where user_id = new.user_id and module_id = new.module_id and status = 'completed') then
    raise exception 'COMPETENCY_NOT_MET' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger credentials_eligibility before insert on credentials for each row execute function credentials_before_insert();

create or replace function credentials_before_update() returns trigger language plpgsql as $$
begin
  -- The hash is what's anchored on-chain; it must never change.
  if new.hash <> old.hash or new.user_id <> old.user_id or new.module_id <> old.module_id or new.issued_at <> old.issued_at then
    raise exception 'CREDENTIAL_IMMUTABLE' using errcode = 'P0001';
  end if;
  if new.tx_hash is not null and old.tx_hash is null then new.confirmed_at := coalesce(new.confirmed_at, now()); end if;
  if new.status = 'revoked' and old.status <> 'revoked' then new.revoked_at := now(); end if;
  if new.status = 'valid' and old.status = 'revoked' then new.revoked_at := null; new.revoked_reason := null; end if;
  return new;
end $$;

create trigger credentials_guard before update on credentials for each row execute function credentials_before_update();

-- ---------------------------------------------------------------------
-- Notifications fan-out (mirrors the in-app events)
-- ---------------------------------------------------------------------
create or replace function notify(aud notification_audience, recipient uuid, k notification_kind, t text, b text, l text)
returns void language sql as $$
  insert into notifications (audience, recipient_id, kind, title, body, link) values (aud, recipient, k, t, b, l);
$$;

create or replace function notify_on_redemption() returns trigger language plpgsql as $$
declare
  u users%rowtype;
  c text;
begin
  select * into u from users where id = new.user_id;
  select code into c from invites where id = new.invite_id;
  perform notify('admins', null, 'student', split_part(u.full_name, ' ', 1) || ' joined', 'Used invite ' || c, '/admin/students');
  perform notify('user', u.id, 'system', 'Welcome to Imari', 'Take the diagnostic to get your path', '/app/assessment');
  return new;
end $$;
create trigger invite_redemptions_notify after insert on invite_redemptions for each row execute function notify_on_redemption();

create or replace function notify_on_attempt() returns trigger language plpgsql as $$
declare
  first_name text;
begin
  if new.completed_at is null or (tg_op = 'UPDATE' and old.completed_at is not null) then return new; end if;
  select split_part(full_name, ' ', 1) into first_name from users where id = new.user_id;
  perform notify('admins', null, 'assessment', first_name || ' finished the ' || case new.kind when 'pre' then 'diagnostic' else 'post-test' end, 'Scored ' || new.total_score || '%', '/admin/students');
  perform notify('user', new.user_id, 'assessment',
    case new.kind when 'pre' then 'Your learning path is ready' else 'Post-test complete' end,
    'You scored ' || new.total_score || '%',
    case new.kind when 'pre' then '/app/results' else '/app/progress' end);
  insert into event_logs (user_id, event, duration_ms, props)
  values (new.user_id, 'assessment.completed', new.duration_ms, jsonb_build_object('kind', new.kind, 'score', new.total_score, 'recommendation_ms', new.recommendation_ms));
  return new;
end $$;
create trigger assessment_attempts_notify after insert or update of completed_at on assessment_attempts for each row execute function notify_on_attempt();

create or replace function notify_on_credential() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    perform notify('user', new.user_id, 'credential', 'Credential issued', new.competency || ' · ' || new.id, '/app/credentials');
    perform notify('admins', null, 'credential', split_part(new.holder_name, ' ', 1) || ' earned a credential', new.competency, '/admin/credentials');
  elsif new.status is distinct from old.status and new.status in ('valid', 'revoked') and old.status <> 'pending' then
    perform notify('user', new.user_id, 'credential', case new.status when 'revoked' then 'Credential revoked' else 'Credential reinstated' end, new.competency || ' · ' || new.id, '/app/credentials');
  end if;
  return new;
end $$;
create trigger credentials_notify after insert or update of status on credentials for each row execute function notify_on_credential();

create or replace function notify_on_publish() returns trigger language plpgsql as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    perform notify('students', null, 'course', 'New: ' || new.title, new.minutes || ' min · earn a credential', '/app/modules/' || new.slug);
  end if;
  return new;
end $$;
create trigger modules_notify after insert or update of published on modules for each row execute function notify_on_publish();

-- ---------------------------------------------------------------------
-- Audit trail for admin-managed tables
-- ---------------------------------------------------------------------
create or replace function audit_row() returns trigger language plpgsql security definer as $$
declare
  actor uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
begin
  insert into audit_log (actor_id, table_name, row_id, action, diff)
  values (
    actor, tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    tg_op,
    case tg_op when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
               when 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_modules     after insert or update or delete on modules           for each row execute function audit_row();
create trigger audit_questions   after insert or update or delete on questions         for each row execute function audit_row();
create trigger audit_invites     after insert or update or delete on invites           for each row execute function audit_row();
create trigger audit_credentials after insert or update or delete on credentials       for each row execute function audit_row();
create trigger audit_settings    after insert or update or delete on platform_settings for each row execute function audit_row();
