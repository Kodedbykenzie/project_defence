-- =====================================================================
-- 0004_rls_and_views.sql — row-level security (Supabase) + reporting views
-- Assumes auth.uid() (Supabase) returns imari.users.id.
-- =====================================================================
set search_path = imari, public;

create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from imari.users where id = auth.uid() and role = 'admin' and deleted_at is null)
$$;

alter table users               enable row level security;
alter table student_profiles    enable row level security;
alter table user_preferences    enable row level security;
alter table assessment_attempts enable row level security;
alter table attempt_answers     enable row level security;
alter table domain_scores       enable row level security;
alter table recommendations     enable row level security;
alter table module_progress     enable row level security;
alter table quiz_attempts       enable row level security;
alter table module_feedback     enable row level security;
alter table credentials         enable row level security;
alter table notifications       enable row level security;
alter table notification_reads  enable row level security;
alter table invites             enable row level security;
alter table modules             enable row level security;
alter table questions           enable row level security;

-- Own rows, or admin
create policy users_self        on users               for select using (id = auth.uid() or is_admin());
create policy users_update_self on users               for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from users where id = auth.uid()));
create policy profiles_self     on student_profiles    for all    using (user_id = auth.uid() or is_admin());
create policy prefs_self        on user_preferences    for all    using (user_id = auth.uid());
create policy attempts_self     on assessment_attempts for all    using (user_id = auth.uid() or is_admin());
create policy answers_self      on attempt_answers     for select using (exists (select 1 from assessment_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or is_admin())));
create policy scores_self       on domain_scores       for select using (exists (select 1 from assessment_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or is_admin())));
create policy recs_self         on recommendations     for all    using (user_id = auth.uid() or is_admin());
create policy progress_self     on module_progress     for all    using (user_id = auth.uid() or is_admin());
create policy quiz_self         on quiz_attempts       for all    using (user_id = auth.uid() or is_admin());
create policy feedback_self     on module_feedback     for all    using (user_id = auth.uid() or is_admin());
create policy creds_self        on credentials         for select using (user_id = auth.uid() or is_admin());
create policy creds_admin_write on credentials         for update using (is_admin());

-- Notifications: direct, or audience match
create policy notifications_read on notifications for select using (
  recipient_id = auth.uid()
  or (audience = 'admins' and is_admin())
  or (audience = 'students' and exists (select 1 from users u where u.id = auth.uid() and u.role = 'student' and u.created_at <= notifications.created_at))
);
create policy notification_reads_self on notification_reads for all using (user_id = auth.uid());

-- Content: students see published; admins manage all
create policy modules_read   on modules   for select using (published or is_admin());
create policy modules_admin  on modules   for all    using (is_admin());
create policy questions_read on questions for select using (is_admin() or (module_id is not null and exists (select 1 from modules m where m.id = module_id and m.published)));
create policy questions_admin on questions for all   using (is_admin());
create policy invites_admin  on invites   for all    using (is_admin());

-- ---------------------------------------------------------------------
-- Public verification view (no personal data beyond holder name)
-- ---------------------------------------------------------------------
create or replace view public_credentials as
  select c.id, c.competency, c.holder_name, c.hash, c.chain_id, c.contract_address, c.tx_hash, c.block_number, c.status, c.issued_at, c.revoked_at
  from credentials c where c.status <> 'pending';

-- ---------------------------------------------------------------------
-- Evaluation views (Table 7 metrics)
-- ---------------------------------------------------------------------
create or replace view v_knowledge_gain as
  select u.id as user_id,
         pre.total_score  as pre_score,
         post.total_score as post_score,
         post.total_score - pre.total_score as gain
  from users u
  join lateral (select total_score from assessment_attempts where user_id = u.id and kind = 'pre'  and completed_at is not null order by completed_at asc  limit 1) pre  on true
  join lateral (select total_score from assessment_attempts where user_id = u.id and kind = 'post' and completed_at is not null order by completed_at desc limit 1) post on true;

create or replace view v_recommendation_accuracy as
  select count(*) filter (where is_correct) * 100.0 / nullif(count(*), 0) as accuracy_pct,
         avg(relevance) as mean_relevance,
         count(*) as total
  from recommendations;

create or replace view v_credential_health as
  select count(*) filter (where status = 'valid')   as valid,
         count(*) filter (where status = 'revoked') as revoked,
         count(*) filter (where status = 'pending') as pending,
         (select count(*) from credential_verifications) as checks,
         (select count(*) filter (where result = 'valid') * 100.0 / nullif(count(*), 0) from credential_verifications) as verify_success_pct
  from credentials;
