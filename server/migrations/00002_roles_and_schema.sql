-- Database roles and the app schema (docs/database.md §2).
-- Runs as the owner (cat locally, postgres on Supabase). The server connects as cat_app, which cannot change the schema.
-- Roles are created without a password; it is set once by hand on each database (never in a file):
--   alter role cat_app password '...';   alter role cat_readonly password '...';
-- Roles belong to the whole Postgres server, not one database, so creating them is idempotent.

-- +goose Up
-- +goose StatementBegin
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cat_app') then
    create role cat_app login;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'cat_readonly') then
    create role cat_readonly login;
  end if;
end $$;
-- +goose StatementEnd

comment on role cat_app is '99ile server at run time: reads and writes app tables, never changes the schema';
comment on role cat_readonly is 'Read-only access for the owner in DBeaver and dashboards; cannot see records.data';

-- Everything 99ile stores lives in schema app, never public (Supabase exposes public through its Data API).
create schema app;
comment on schema app is '99ile tables. Not exposed through the Supabase Data API';

grant usage on schema app to cat_app, cat_readonly;

-- Tables created later by the owner get these privileges automatically. Append-only and column limits
-- (audit_events, records.data) are set in the migration that creates those tables.
alter default privileges in schema app grant select, insert, update, delete on tables to cat_app;
alter default privileges in schema app grant usage, select on sequences to cat_app;
alter default privileges in schema app grant select on tables to cat_readonly;

-- The server checks the schema version at start and in /readyz, so it can say "waiting for a database update".
grant select on public.goose_db_version to cat_app, cat_readonly;

-- Supabase's API roles get nothing here, if they exist (they do not on a plain Postgres). Supabase's default
-- privileges also hand them every new table in public, which includes goose's version table, so take that back too.
-- +goose StatementBegin
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema app from %I', r);
      execute format('revoke all on public.goose_db_version from %I', r);
    end if;
  end loop;
end $$;
-- +goose StatementEnd

-- One trigger function for every table with updated_at (docs/database.md §1).
-- +goose StatementBegin
create function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
-- +goose StatementEnd
comment on function app.touch_updated_at() is 'Sets updated_at on every update; attached to tables whose content is edited in place';

-- +goose Down
drop function app.touch_updated_at();
revoke select on public.goose_db_version from cat_app, cat_readonly;
drop schema app;
-- The roles stay: other databases on the same server may use them.
