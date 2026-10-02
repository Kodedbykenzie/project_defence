-- =====================================================================
-- 0002_indexes.sql — indexes for the hot query paths
-- =====================================================================
set search_path = imari, public;

-- People
create index users_role_idx            on users (role) where deleted_at is null;
create index users_name_trgm_idx       on users using gin (full_name gin_trgm_ops);
create index users_created_idx         on users (created_at desc);
create index student_profiles_inst_idx on student_profiles (institution_id);
create index student_profiles_consent_idx on student_profiles (research_consent) where consent_withdrawn_at is null;
create index reset_codes_user_idx      on password_reset_codes (user_id, created_at desc) where used_at is null;
create index cookie_consents_user_idx  on cookie_consents (user_id, created_at desc);
create index cookie_consents_anon_idx  on cookie_consents (anonymous_id, created_at desc);

-- Invites
create index invites_active_idx        on invites (expires_at) where revoked_at is null;
create index invites_email_idx         on invites (email) where email is not null;
create index invite_redemptions_invite_idx on invite_redemptions (invite_id, redeemed_at desc);

-- Content
create index modules_domain_idx        on modules (domain_id) where published;
create index modules_starter_idx       on modules (is_starter) where published and is_starter;
create index modules_search_idx        on modules using gin (search);
create index modules_title_trgm_idx    on modules using gin (title gin_trgm_ops);
create index lessons_module_idx        on lessons (module_id, position);
create index resources_module_idx      on module_resources (module_id);
create index questions_diag_idx        on questions (domain_id, position) where module_id is null and active;
create index questions_module_idx      on questions (module_id, position) where module_id is not null;

-- Assessment
create index attempts_user_idx         on assessment_attempts (user_id, kind, completed_at desc);
create index attempts_completed_idx    on assessment_attempts (completed_at desc) where completed_at is not null;
create index domain_scores_domain_idx  on domain_scores (domain_id, score);
create index recommendations_user_idx  on recommendations (user_id, priority);
create index recommendations_module_idx on recommendations (module_id);

-- Progress
create index progress_module_status_idx on module_progress (module_id, status);
create index progress_user_status_idx  on module_progress (user_id, status);
create index quiz_attempts_user_mod_idx on quiz_attempts (user_id, module_id, created_at desc);
create index feedback_module_idx       on module_feedback (module_id);

-- Credentials
create index credentials_user_idx      on credentials (user_id, issued_at desc);
create index credentials_status_idx    on credentials (status);
create index credentials_tx_idx        on credentials (tx_hash) where tx_hash is not null;
create index verifications_cred_idx    on credential_verifications (credential_id, created_at desc);
create index verifications_created_idx on credential_verifications (created_at desc);

-- Notifications
create index notifications_recipient_idx on notifications (recipient_id, created_at desc) where audience = 'user';
create index notifications_audience_idx on notifications (audience, created_at desc) where audience <> 'user';
create index notification_reads_user_idx on notification_reads (user_id);

-- Evaluation
create index event_logs_event_idx      on event_logs (event, created_at desc);
create index event_logs_user_idx       on event_logs (user_id, created_at desc);
create index event_logs_failures_idx   on event_logs (created_at desc) where not success;
create index audit_log_row_idx         on audit_log (table_name, row_id, created_at desc);
