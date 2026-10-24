-- Staff roles and the admin page (docs/database.md §4, B8, docs/feature.md F79). Permissions are fixed keys checked
-- in code (internal/admin); a role is a set of them; a grant gives a role to a signed-in account (D13), never to an
-- anonymous identity. Grants are made only by the owner (cmd/grant): the API can read them, never write them.

-- +goose Up
create schema access;
comment on schema access is '99ile: staff roles and who holds them. No study progress';
grant usage on schema access to cat_app, cat_readonly;

create table access.roles (
  key         text primary key check (key ~ '^[a-z_]{2,32}$'),
  name        text not null,
  description text not null,
  created_at  timestamptz not null default now()
);
comment on table access.roles is 'A named set of permissions. Changed only by migrations';

create table access.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null,
  created_at  timestamptz not null default now()
);
comment on table access.permissions is 'A fixed key that code checks (area.verb). Changed only by migrations; internal/admin has the same keys';

create table access.role_permissions (
  role_key       text not null references access.roles (key) on delete cascade,
  permission_key text not null references access.permissions (key) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (role_key, permission_key)
);
create index role_permissions_permission_key_idx on access.role_permissions (permission_key);
comment on table access.role_permissions is 'Which permissions each role has';

create table access.grants (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references account.users (id) on delete cascade,
  role_key   text not null references access.roles (key) on delete restrict,
  reason     text not null default '' check (length(reason) <= 200),
  granted_by uuid references account.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references account.users (id) on delete set null,
  check (revoked_by is null or revoked_at is not null)
);
create unique index grants_active_idx on access.grants (user_id, role_key) where revoked_at is null;
create index grants_role_key_idx on access.grants (role_key);
create index grants_granted_by_idx on access.grants (granted_by) where granted_by is not null;
create index grants_revoked_by_idx on access.grants (revoked_by) where revoked_by is not null;

comment on table access.grants is 'A role given to an account. Never deleted: revoked, so the history stays';
comment on column access.grants.user_id is 'Who holds the role: an account, so a device cookie alone can never be staff';
comment on column access.grants.reason is 'Why, in a few words';
comment on column access.grants.granted_by is 'Who granted it; null = the owner''s command (cmd/grant)';
comment on column access.grants.revoked_at is 'When it stopped; null = active';
comment on column access.grants.revoked_by is 'Who revoked it; null with revoked_at = the owner''s command';

insert into access.roles (key, name, description) values
  ('admin', 'Admin', 'Runs 99ile: reports, accounts, roles. Never reads a student''s answers'),
  ('moderator', 'Moderator', 'Reads and closes problem reports, sees counts');

insert into access.permissions (key, description) values
  ('feedback.read', 'See problem reports'),
  ('feedback.resolve', 'Mark a report seen, fixed or won''t fix'),
  ('audit.read', 'Read the audit log'),
  ('identity.read', 'See an identity''s devices, dates and status (not its records)'),
  ('identity.suspend', 'Stop an abusive identity from syncing'),
  ('identity.delete', 'Delete an identity and its data on request'),
  ('role.grant', 'Grant and revoke roles'),
  ('stats.read', 'Counts: identities, devices, records, sync volume'),
  ('records.read', 'Read a student''s synced data. Granted to no role (D14)');

insert into access.role_permissions (role_key, permission_key) values
  ('admin', 'feedback.read'), ('admin', 'feedback.resolve'), ('admin', 'audit.read'), ('admin', 'identity.read'),
  ('admin', 'identity.suspend'), ('admin', 'identity.delete'), ('admin', 'role.grant'), ('admin', 'stats.read'),
  ('moderator', 'feedback.read'), ('moderator', 'feedback.resolve'), ('moderator', 'identity.read'), ('moderator', 'stats.read');

grant select on all tables in schema access to cat_app, cat_readonly;
select app.lock_out_api_roles('access');

-- Who last changed a report's status. The admin page reads notes, so cat_app may now read every column.
alter table support.feedback add column handled_by uuid references account.users (id) on delete set null;
create index feedback_handled_by_idx on support.feedback (handled_by) where handled_by is not null;
comment on column support.feedback.handled_by is 'The staff account that last changed the status; null when the digest or the owner did';
grant select on support.feedback to cat_app;
grant update (status, handled_by, handled_at, updated_at) on support.feedback to cat_app;
grant select (handled_by) on support.feedback to cat_readonly;

-- +goose Down
revoke update (status, handled_by, handled_at, updated_at) on support.feedback from cat_app;
revoke select on support.feedback from cat_app;
alter table support.feedback drop column handled_by;
drop table access.grants;
drop table access.role_permissions;
drop table access.permissions;
drop table access.roles;
drop schema access;
