-- Schema account: who someone is (docs/database.md §1.2, §5.1, §5.2). B2 creates identities and devices;
-- recovery and link codes (B4), users and OAuth links (B7) and profiles come later in their own migrations.

-- +goose Up
-- Supabase's API roles get nothing in our schemas. Called at the end of every migration that creates a schema
-- or tables, so tables made later are covered too. Only the owner runs migrations, so nobody else may call it.
-- +goose StatementBegin
create function app.lock_out_api_roles(s name) returns void
language plpgsql set search_path = '' as $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema %I from %I', s, r);
      execute format('revoke all on all tables in schema %I from %I', s, r);
      execute format('revoke all on all sequences in schema %I from %I', s, r);
      execute format('revoke all on all functions in schema %I from %I', s, r);
    end if;
  end loop;
end $$;
-- +goose StatementEnd
revoke execute on function app.lock_out_api_roles(name) from public;
comment on function app.lock_out_api_roles(name) is 'Revokes everything in a schema from Supabase''s anon, authenticated and service_role; run by migrations';

create schema account;
comment on schema account is '99ile: who someone is. Identities and their devices; later recovery and link codes, accounts, profiles';

grant usage on schema account to cat_app, cat_readonly;
alter default privileges in schema account grant select, insert, update, delete on tables to cat_app;
alter default privileges in schema account grant usage, select on sequences to cat_app;
alter default privileges in schema account grant select on tables to cat_readonly;

create table account.identities (
  id               uuid primary key,
  status           text not null default 'active' check (status in ('active', 'suspended')),
  suspended_at     timestamptz,
  suspended_reason text check (length(suspended_reason) <= 200),
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  check ((status = 'suspended') = (suspended_at is not null))
);
create index identities_last_seen_at_idx on account.identities (last_seen_at);

comment on table account.identities is 'The anonymous owner of synced progress. No name, email or password';
comment on column account.identities.id is 'uuid v7, made by the server';
comment on column account.identities.status is 'active or suspended. Deleted identities are removed, not flagged';
comment on column account.identities.suspended_at is 'When an admin stopped this identity from syncing; null while active';
comment on column account.identities.suspended_reason is 'Short note from the admin who suspended it';
comment on column account.identities.created_at is 'When sync was first turned on';
comment on column account.identities.last_seen_at is 'Activity: updated at most once an hour';

create table account.devices (
  id             uuid primary key,
  identity_id    uuid not null references account.identities (id) on delete cascade,
  secret_hash    bytea not null check (octet_length(secret_hash) = 32),
  label          text not null default '' check (length(label) <= 60),
  platform       text not null default 'other' check (platform in ('ios', 'android', 'mac', 'windows', 'linux', 'other')),
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz not null default now(),
  last_synced_at timestamptz,
  revoked_at     timestamptz,
  revoked_reason text check (revoked_reason in ('signed_out', 'removed', 'recovery', 'admin')),
  check ((revoked_at is null) = (revoked_reason is null))
);
create unique index devices_secret_hash_idx on account.devices (secret_hash);
create index devices_identity_id_idx on account.devices (identity_id) where revoked_at is null;

comment on table account.devices is 'One browser that syncs. Its cookie is the only session';
comment on column account.devices.id is 'uuid v7, made by the server';
comment on column account.devices.identity_id is 'The identity this browser syncs as';
comment on column account.devices.secret_hash is 'SHA-256 of the 32-byte cookie secret. Hidden from cat_readonly';
comment on column account.devices.label is 'Shown in the device list, such as Chrome on Android';
comment on column account.devices.platform is 'An icon in the device list';
comment on column account.devices.created_at is 'When this browser joined';
comment on column account.devices.last_used_at is 'Activity: updated at most every 10 minutes';
comment on column account.devices.last_synced_at is 'Last pull or push, shown as last synced';
comment on column account.devices.revoked_at is 'When this browser was removed; it then gets 401';
comment on column account.devices.revoked_reason is 'signed_out, removed, recovery or admin';

-- Browsing the database never shows a usable secret.
revoke select on account.devices from cat_readonly;
grant select (id, identity_id, label, platform, created_at, last_used_at, last_synced_at, revoked_at, revoked_reason)
  on account.devices to cat_readonly;

select app.lock_out_api_roles('account');

-- +goose Down
drop schema account cascade;
drop function app.lock_out_api_roles(name);
