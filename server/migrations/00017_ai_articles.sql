-- Article to RC (F34, D104, docs/design/article-to-rc.md): article sets made in the background, and each student's
-- new sets a day. A job holds the article's text only while it runs (input is cleared when it ends); a finished job
-- keeps the questions under the text's hash for 30 days, so the same article is made once. Failed jobs go after a day.

-- +goose Up
create table ai.jobs (
  id          uuid primary key,
  identity_id uuid not null references account.identities (id) on delete cascade,
  kind        text not null check (kind in ('article')),
  state       text not null default 'queued' check (state in ('queued', 'running', 'done', 'failed')),
  input       jsonb check (input is null or octet_length(input::text) <= 40000),
  input_hash  bytea not null check (octet_length(input_hash) = 32),
  output      jsonb check (output is null or octet_length(output::text) <= 40000),
  error       text check (error is null or length(error) <= 300),
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index ai_jobs_queue on ai.jobs (state, created_at);
create index ai_jobs_hash on ai.jobs (input_hash) where state = 'done';
comment on table ai.jobs is 'Article sets being made or made: the text only while running, the questions for 30 days';

create table ai.article_daily (
  identity_id uuid not null references account.identities (id) on delete cascade,
  day         date not null,
  n           integer not null default 0 check (n >= 0),
  primary key (identity_id, day)
);
comment on table ai.article_daily is 'New article sets a student started on a day: the article cap. Kept 14 days';

grant select, insert, update, delete on ai.jobs, ai.article_daily to cat_app;
grant select on ai.article_daily to cat_readonly;

-- +goose Down
drop table ai.article_daily;
drop table ai.jobs;
