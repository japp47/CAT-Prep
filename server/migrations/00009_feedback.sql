-- Schema support: problem reports from students (docs/database.md §5, B6, docs/feature.md F39).
-- The server only adds reports. The owner reads and resolves them with the saved query in server/README.md;
-- who handled a report (handled_by) comes with staff accounts in B7.

-- +goose Up
create schema support;
comment on schema support is '99ile: problem reports about questions. No study progress';

grant usage on schema support to cat_app, cat_readonly;
alter default privileges in schema support grant usage on sequences to cat_app;

create table support.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  identity_id uuid references account.identities (id) on delete set null,
  page        text not null check (page ~ '^/' and length(page) <= 200),
  item_id     text not null check (item_id ~ '^[A-Za-z0-9:_.-]{1,100}$'),
  kind        text not null check (kind in ('answer_key', 'unclear', 'typo', 'other')),
  note        text not null default '' check (length(note) <= 1000),
  status      text not null default 'new' check (status in ('new', 'seen', 'fixed', 'wont_fix')),
  handled_at  timestamptz,
  check ((status in ('fixed', 'wont_fix')) = (handled_at is not null))
);
create index feedback_open_idx on support.feedback (created_at desc) where status in ('new', 'seen');
create index feedback_item_idx on support.feedback (item_id);
create index feedback_identity_id_idx on support.feedback (identity_id) where identity_id is not null;

comment on table support.feedback is 'Problem reports on a question. The server inserts only; the owner resolves them';
comment on column support.feedback.id is 'Also the newest-first order';
comment on column support.feedback.created_at is 'When it was sent';
comment on column support.feedback.updated_at is 'Last status change';
comment on column support.feedback.identity_id is 'The sender when sync is on, else null; set null when the identity is deleted';
comment on column support.feedback.page is 'The page path, without the query string';
comment on column support.feedback.item_id is 'The question: rc:<set>:<n>, a VA key such as pj:bees, or cr:<id>';
comment on column support.feedback.kind is 'answer_key, unclear, typo or other';
comment on column support.feedback.note is 'What the student wrote, up to 1,000 characters. Hidden from cat_readonly';
comment on column support.feedback.status is 'new, seen, fixed or wont_fix';
comment on column support.feedback.handled_at is 'When it was fixed or closed';

grant insert (identity_id, page, item_id, kind, note) on support.feedback to cat_app;
grant select (id, created_at, updated_at, identity_id, page, item_id, kind, status, handled_at) on support.feedback to cat_readonly;

select app.lock_out_api_roles('support');

-- +goose Down
drop table support.feedback;
drop schema support;
