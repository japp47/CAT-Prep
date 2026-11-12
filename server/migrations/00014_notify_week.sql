-- The weekly review email (R2, D97, docs/design/notifications.md §15.1). Two small tables, so the server never
-- reads a student's synced records: the days they practised, written by the practice hook, and one summary a week
-- that their own browser writes while the weekly review is switched on. Both go with the identity.

-- +goose Up
create table notify.days (
  identity_id uuid not null references account.identities (id) on delete cascade,
  day         date not null,
  primary key (identity_id, day)
);
comment on table notify.days is 'Days a student practised, in their time zone, from synced attempts. Kept eight weeks';
comment on column notify.days.identity_id is 'The student';
comment on column notify.days.day is 'A local day with at least one attempt';

create table notify.weeks (
  identity_id uuid not null references account.identities (id) on delete cascade,
  monday      date not null check (extract(isodow from monday) = 1),
  data        jsonb not null check (octet_length(data::text) <= 1024),
  updated_at  timestamptz not null default now(),
  primary key (identity_id, monday)
);
comment on table notify.weeks is 'A week''s figures for the weekly review email, written by the student''s browser while the weekly review is on. Kept eight weeks; deleted when it is turned off';
comment on column notify.weeks.identity_id is 'The student';
comment on column notify.weeks.monday is 'The week, by its Monday';
comment on column notify.weeks.data is 'Counts, percentages and fixed skill or trap names only (notify.WeekMail); never answers or text the student wrote';
comment on column notify.weeks.updated_at is 'Last written by the browser';

grant select, insert, update, delete on notify.days, notify.weeks to cat_app;
grant select on notify.days to cat_readonly;
grant select (identity_id, monday, updated_at) on notify.weeks to cat_readonly;

-- +goose Down
drop table notify.weeks;
drop table notify.days;
