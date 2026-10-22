-- Schema sync: synced progress (docs/database.md §5.3, §5.4, docs/architecture.md §6).

-- +goose Up
create schema sync;
comment on schema sync is '99ile: synced progress, one row per record, ordered by the server';

grant usage on schema sync to cat_app, cat_readonly;
alter default privileges in schema sync grant select, insert, update, delete on tables to cat_app;
alter default privileges in schema sync grant usage, select on sequences to cat_app;
alter default privileges in schema sync grant select on tables to cat_readonly;

create sequence sync.rev as bigint;
comment on sequence sync.rev is 'Server order: every accepted write takes the next value';

create table sync.heads (
  identity_id  uuid primary key references account.identities (id) on delete cascade,
  rev          bigint not null default 0 check (rev >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  data_bytes   bigint not null default 0 check (data_bytes >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger heads_touch_updated_at before update on sync.heads
  for each row execute function app.touch_updated_at();

comment on table sync.heads is 'One row per identity. Every push locks it first, so one identity''s pushes run in turn and a pull never skips a row';
comment on column sync.heads.identity_id is 'The identity this head belongs to';
comment on column sync.heads.rev is 'The highest rev given to this identity''s records';
comment on column sync.heads.record_count is 'Rows in sync.records for this identity, deletions included';
comment on column sync.heads.data_bytes is 'Sum of sync.records.data_bytes for this identity';
comment on column sync.heads.created_at is 'Made with the identity';
comment on column sync.heads.updated_at is 'Last accepted push';

create table sync.records (
  identity_id uuid not null references account.identities (id) on delete cascade,
  kind        text not null check (kind ~ '^[a-z][a-zA-Z]{1,23}$'),
  rec_id      text not null check (length(rec_id) between 1 and 200),
  data        jsonb check (octet_length(data::text) <= 16384),
  deleted     boolean not null default false,
  data_bytes  integer not null generated always as (coalesce(octet_length(data::text), 0)) stored,
  stamp       bigint not null,
  rev         bigint not null default nextval('sync.rev'),
  device_id   uuid references account.devices (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (identity_id, kind, rec_id),
  check (deleted = (data is null))
);
create unique index records_pull_idx on sync.records (identity_id, rev);
create trigger records_touch_updated_at before update on sync.records
  for each row execute function app.touch_updated_at();

comment on table sync.records is 'Synced progress: one row per record. The server stores data without reading it';
comment on column sync.records.identity_id is 'Whose record it is';
comment on column sync.records.kind is 'rc, day, redo…; the allowed list lives in the Go server';
comment on column sync.records.rec_id is 'The row''s id in the browser';
comment on column sync.records.data is 'The record as the browser sent it; null for a deletion. Hidden from cat_readonly';
comment on column sync.records.deleted is 'A tombstone, kept so offline devices learn about the deletion';
comment on column sync.records.data_bytes is 'Size of data, kept for the per-identity limit';
comment on column sync.records.stamp is 'The device''s hybrid-clock stamp (ms); only a tiebreak in browser merges';
comment on column sync.records.rev is 'Server order; a new value on every accepted write';
comment on column sync.records.device_id is 'The device that wrote it last';
comment on column sync.records.created_at is 'First write';
comment on column sync.records.updated_at is 'Last accepted write';

-- A student's answers are never shown by accident.
revoke select on sync.records from cat_readonly;
grant select (identity_id, kind, rec_id, deleted, data_bytes, stamp, rev, device_id, created_at, updated_at)
  on sync.records to cat_readonly;

select app.lock_out_api_roles('sync');

-- +goose Down
drop schema sync cascade;
