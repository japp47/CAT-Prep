-- AI v1 (F35, D100, docs/design/explain-mistake.md): explanations shared by everyone who makes the same mistake, the
-- day's token budget, each student's new requests a day, and flags on explanations that are wrong. No row holds a
-- student's answers or anything they typed; a cached explanation is keyed by content ids, not by who asked.

-- +goose Up
create schema ai;
comment on schema ai is '99ile: AI explanations, cached per mistake, with budgets and flags';
grant usage on schema ai to cat_app, cat_readonly;

create table ai.cache (
  key        bytea primary key check (octet_length(key) = 32),
  kind       text not null check (kind ~ '^[a-z][a-z_]{1,31}$'),
  model      text not null check (length(model) between 1 and 100),
  prompt_v   smallint not null,
  output     jsonb not null check (octet_length(output::text) <= 4096),
  tokens     integer not null check (tokens >= 0),
  flags      integer not null default 0 check (flags >= 0),
  created_at timestamptz not null default now()
);
comment on table ai.cache is 'One explanation per mistake (kind, content ids, chosen option, marked line), shared by every student who makes it';
comment on column ai.cache.key is 'sha-256 of the kind and content ids; never anything about who asked';
comment on column ai.cache.prompt_v is 'The prompt version that made it; a new version makes fresh ones';
comment on column ai.cache.flags is 'Students who said it is wrong';

create table ai.usage (
  day         date not null,
  kind        text not null,
  generations integer not null default 0 check (generations >= 0),
  tokens      integer not null default 0 check (tokens >= 0),
  primary key (day, kind)
);
comment on table ai.usage is 'New generations and tokens per day: the total budget';

create table ai.model_usage (
  day      date not null,
  model    text not null check (length(model) between 1 and 100),
  answered integer not null default 0 check (answered >= 0),
  refused  integer not null default 0 check (refused >= 0),
  limited  integer not null default 0 check (limited >= 0),
  failed   integer not null default 0 check (failed >= 0),
  tokens   integer not null default 0 check (tokens >= 0),
  primary key (day, model)
);
comment on table ai.model_usage is 'Per day and model (a models.json name): calls answered, replies refused by the check, calls over the provider limit, other failures, tokens';

create table ai.daily (
  identity_id uuid not null references account.identities (id) on delete cascade,
  day         date not null,
  n           integer not null default 0 check (n >= 0),
  primary key (identity_id, day)
);
comment on table ai.daily is 'New explanations a student asked for on a day: the per-student cap. Kept 14 days';

create table ai.flags (
  key         bytea not null references ai.cache (key) on delete cascade,
  identity_id uuid not null references account.identities (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (key, identity_id)
);
comment on table ai.flags is 'One flag per student per explanation';

grant select, insert, update, delete on ai.cache, ai.usage, ai.model_usage, ai.daily, ai.flags to cat_app;
grant select on ai.cache, ai.usage, ai.model_usage, ai.flags to cat_readonly;

-- +goose Down
drop table ai.flags;
drop table ai.daily;
drop table ai.model_usage;
drop table ai.usage;
drop table ai.cache;
drop schema ai;
