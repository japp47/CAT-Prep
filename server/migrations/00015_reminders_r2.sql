-- Reminders R2, the rest (D97, docs/design/notifications.md §15.2, §15.3): the bounces the worker has read from the
-- team inbox's bounce label, so each is handled once; a daily count of unsubscribes, with no identity in it, for the
-- owner's panel; and the permission to send yourself a test reminder or mark an address bounced.

-- +goose Up
create table notify.bounces (
  gmail_id  text primary key check (length(gmail_id) between 1 and 64),
  addresses smallint not null check (addresses >= 0),
  matched   boolean not null,
  seen_at   timestamptz not null default now()
);
comment on table notify.bounces is 'Bounce emails read from the team inbox (headers only), so each is handled once. No address is kept. Kept 60 days';
comment on column notify.bounces.gmail_id is 'Gmail''s id of the bounce message';
comment on column notify.bounces.addresses is 'Failed addresses its X-Failed-Recipients header named; 0 when the header was missing';
comment on column notify.bounces.matched is 'One of them was a student''s address, now marked bounced';
comment on column notify.bounces.seen_at is 'When the worker read it';

create table notify.unsubscribes (
  day   date not null,
  scope text not null check (scope in ('reminders', 'weekly')),
  n     integer not null default 0 check (n >= 0),
  primary key (day, scope)
);
comment on table notify.unsubscribes is 'One-click unsubscribes per day and scope, counted for the owner''s panel; no identity';

grant select, insert, delete on notify.bounces to cat_app;
grant select, insert, update on notify.unsubscribes to cat_app;
grant select on notify.bounces, notify.unsubscribes to cat_readonly;

insert into access.permissions (key, description) values
  ('reminders.manage', 'Send yourself a test reminder; mark an address as bounced');
insert into access.role_permissions (role_key, permission_key) values ('admin', 'reminders.manage');

-- +goose Down
delete from access.role_permissions where permission_key = 'reminders.manage';
delete from access.permissions where key = 'reminders.manage';
drop table notify.unsubscribes;
drop table notify.bounces;
