-- Store origin metadata for audited administrator changes.
-- IP comes from Fastify's observed request address; location is optional consented browser metadata.
alter table imari.audit_log
  add column if not exists client_ip inet,
  add column if not exists client_location jsonb;

create or replace function imari.audit_row() returns trigger language plpgsql security definer
set search_path = imari, public as $$
declare
  actor uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  client_ip_value inet := nullif(current_setting('request.client.ip', true), '')::inet;
  client_location_value jsonb := nullif(current_setting('request.client.location', true), '')::jsonb;
begin
  insert into audit_log (actor_id, table_name, row_id, action, diff, client_ip, client_location)
  values (
    actor, tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    tg_op,
    case tg_op when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
               when 'DELETE' then to_jsonb(old) else to_jsonb(new) end,
    client_ip_value,
    client_location_value
  );
  return coalesce(new, old);
end $$;
