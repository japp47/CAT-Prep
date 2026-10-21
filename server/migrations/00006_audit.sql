-- Schema audit: append-only history of security and account events (docs/database.md §5.5).
-- The server may only add and read rows; the monthly clean-up runs as the owner.

-- +goose Up
create schema audit;
comment on schema audit is '99ile: append-only security and account events. Never study content';

grant usage on schema audit to cat_app, cat_readonly;
alter default privileges in schema audit grant select, insert on tables to cat_app;
alter default privileges in schema audit grant usage on sequences to cat_app;
alter default privileges in schema audit grant select on tables to cat_readonly;

create table audit.events (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  action              text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  actor_type          text not null check (actor_type in ('device', 'user', 'admin', 'system')),
  actor_identity_id   uuid references account.identities (id) on delete set null,
  actor_device_id     uuid references account.devices (id) on delete set null,
  subject_identity_id uuid references account.identities (id) on delete set null,
  target_type         text check (target_type ~ '^[a-z_]{2,32}$'),
  target_id           text check (length(target_id) <= 100),
  request_id          text check (length(request_id) <= 64),
  ip_hash             bytea check (octet_length(ip_hash) = 32),
  ip_key              smallint,
  meta                jsonb not null default '{}' check (octet_length(meta::text) <= 2048),
  check ((target_type is null) = (target_id is null)),
  check ((ip_hash is null) = (ip_key is null))
);
create index events_created_at_idx on audit.events using brin (created_at);
create index events_subject_idx on audit.events (subject_identity_id, id desc);
create index events_action_idx on audit.events (action, id desc);
create index events_ip_hash_idx on audit.events (ip_hash, id desc) where ip_hash is not null;

comment on table audit.events is 'Append-only: cat_app can insert and select, never update or delete';
comment on column audit.events.id is 'Also the newest-first order';
comment on column audit.events.created_at is 'When it happened';
comment on column audit.events.action is 'area.verb, such as identity.created';
comment on column audit.events.actor_type is 'device, user (B7), admin or system';
comment on column audit.events.actor_identity_id is 'Who did it';
comment on column audit.events.actor_device_id is 'From which device';
comment on column audit.events.subject_identity_id is 'Whose data it affected';
comment on column audit.events.target_type is 'What it acted on: device, grant, feedback…';
comment on column audit.events.target_id is 'The target''s id as text';
comment on column audit.events.request_id is 'Matches the server log line';
comment on column audit.events.ip_hash is 'HMAC-SHA256 of the IP with a server key; never the address';
comment on column audit.events.ip_key is 'Which key made ip_hash; compare hashes only within one key';
comment on column audit.events.meta is 'Small details. Never secrets, codes, cookies or study content';

select app.lock_out_api_roles('audit');

-- +goose Down
drop schema audit cascade;
