-- Schema notify: study reminders by push and email (docs/feature.md F65, docs/design/notifications.md §5, D89).
-- The API writes a student's choices, their devices' push subscriptions and when they last practised; the
-- reminder job (cmd/notify, the owner's connection) plans and sends messages. Every row goes with its identity.

-- +goose Up
create schema notify;
comment on schema notify is '99ile: study reminders. Choices, push subscriptions, last practice, and the message queue';

grant usage on schema notify to cat_app, cat_readonly;
alter default privileges in schema notify grant usage, select on sequences to cat_app;

create table notify.prefs (
  identity_id  uuid primary key references account.identities (id) on delete cascade,
  enabled      boolean not null default false,
  at_minute    smallint not null default 1170 check (at_minute between 0 and 1439 and at_minute % 15 = 0),
  days         smallint not null default 127 check (days between 0 and 127),
  tz           text not null default 'Asia/Kolkata' check (length(tz) between 1 and 64),
  quiet_from   smallint not null default 1380 check (quiet_from between 0 and 1439),
  quiet_to     smallint not null default 420 check (quiet_to between 0 and 1439),
  email_mode   text not null default 'off' check (email_mode in ('off', 'missed', 'daily')),
  weekly       boolean not null default false,
  paused_until timestamptz,
  email_state  text not null default 'ok' check (email_state in ('ok', 'bounced')),
  enabled_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (not enabled or enabled_at is not null)
);
create index prefs_enabled_idx on notify.prefs (identity_id) where enabled;
create trigger prefs_touch_updated_at before update on notify.prefs
  for each row execute function app.touch_updated_at();

comment on table notify.prefs is 'A student''s reminder choices, one row per identity; made when they first open Reminders';
comment on column notify.prefs.identity_id is 'The student';
comment on column notify.prefs.enabled is 'Reminders on or off';
comment on column notify.prefs.at_minute is 'Reminder time, minutes after midnight in tz, in 15-minute steps';
comment on column notify.prefs.days is 'Days with reminders: bit n is weekday n, Sunday = 0';
comment on column notify.prefs.tz is 'IANA time zone from the browser, such as Asia/Kolkata';
comment on column notify.prefs.quiet_from is 'Start of quiet hours, minutes after midnight in tz';
comment on column notify.prefs.quiet_to is 'End of quiet hours, minutes after midnight in tz';
comment on column notify.prefs.email_mode is 'off, missed (only when days are missed) or daily (every reminder day too)';
comment on column notify.prefs.weekly is 'The Sunday review by email';
comment on column notify.prefs.paused_until is 'No reminders before this time (pause for a week)';
comment on column notify.prefs.email_state is 'ok, or bounced (the address failed; email stops until it is turned on again)';
comment on column notify.prefs.enabled_at is 'When reminders were last turned on; the first one comes on a later day';
comment on column notify.prefs.created_at is 'First saved';
comment on column notify.prefs.updated_at is 'Last change';

create table notify.push_subs (
  id          bigint generated always as identity primary key,
  identity_id uuid not null references account.identities (id) on delete cascade,
  device_id   uuid references account.devices (id) on delete cascade,
  endpoint    text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) between 80 and 100),
  auth        text not null check (length(auth) between 16 and 32),
  failures    smallint not null default 0 check (failures >= 0),
  last_ok_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index push_subs_identity_idx on notify.push_subs (identity_id);
create index push_subs_device_idx on notify.push_subs (device_id) where device_id is not null;

comment on table notify.push_subs is 'One browser''s web push subscription. Removed when the push service says it is gone';
comment on column notify.push_subs.id is 'Row id';
comment on column notify.push_subs.identity_id is 'The student';
comment on column notify.push_subs.device_id is 'The device that subscribed, so it can turn its own push off';
comment on column notify.push_subs.endpoint is 'The push service address for this browser';
comment on column notify.push_subs.p256dh is 'The browser''s public key, base64url';
comment on column notify.push_subs.auth is 'The browser''s auth secret, base64url';
comment on column notify.push_subs.failures is 'Failed sends in a row; reset by a success';
comment on column notify.push_subs.last_ok_at is 'Last push the service accepted';
comment on column notify.push_subs.created_at is 'When the browser subscribed';

create table notify.activity (
  identity_id uuid primary key references account.identities (id) on delete cascade,
  last_at     timestamptz not null,
  last_day    date not null,
  streak      integer not null default 1 check (streak >= 1)
);

comment on table notify.activity is 'When a student last practised, from synced attempts; so the reminder job never scans records';
comment on column notify.activity.identity_id is 'The student';
comment on column notify.activity.last_at is 'When the last attempt reached the server';
comment on column notify.activity.last_day is 'That day in the student''s time zone';
comment on column notify.activity.streak is 'Days in a row with practice, ending at last_day';

create table notify.messages (
  id           bigint generated always as identity primary key,
  identity_id  uuid not null references account.identities (id) on delete cascade,
  kind         text not null check (kind ~ '^[a-z0-9-]{1,32}$'),
  channel      text not null check (channel in ('email', 'push')),
  dedupe_key   text not null unique check (length(dedupe_key) <= 200),
  variant      text not null default '' check (length(variant) <= 32),
  vars         jsonb not null default '{}' check (octet_length(vars::text) <= 4096),
  priority     smallint not null default 5,
  run_at       timestamptz not null default now(),
  status       text not null default 'queued' check (status in ('queued', 'working', 'sent', 'skipped', 'failed', 'dead')),
  attempts     smallint not null default 0 check (attempts >= 0),
  locked_until timestamptz,
  reason       text not null default '' check (length(reason) <= 500),
  sent_at      timestamptz,
  opened_at    timestamptz,
  practised_at timestamptz,
  created_at   timestamptz not null default now(),
  check ((status = 'sent') = (sent_at is not null))
);
create index messages_due_idx on notify.messages (priority, run_at) where status in ('queued', 'working');
create index messages_identity_idx on notify.messages (identity_id, created_at desc);

comment on table notify.messages is 'The reminder queue and its history: one row per message and channel. Kept 30 days';
comment on column notify.messages.id is 'Row id; carried in the message''s links as m';
comment on column notify.messages.identity_id is 'The student';
comment on column notify.messages.kind is 'daily, daily-streak, missed-2, missed-5, missed-12, weekly';
comment on column notify.messages.channel is 'email or push';
comment on column notify.messages.dedupe_key is 'identity:kind:channel:day; a second message with the same key is refused';
comment on column notify.messages.variant is 'Which wording was sent (templates/messages.json)';
comment on column notify.messages.vars is 'What the wording needs: first name, streak, days missed, the task. Nothing else';
comment on column notify.messages.priority is 'Lower goes first when the email budget is short: missed days, weekly, daily';
comment on column notify.messages.run_at is 'Not before this time; moved later by a retry';
comment on column notify.messages.status is 'queued, working, sent, skipped (with reason), failed, or dead (tries used up)';
comment on column notify.messages.attempts is 'Sends tried';
comment on column notify.messages.locked_until is 'A worker holds it until then; after that another may claim it';
comment on column notify.messages.reason is 'Why it was skipped or the last error';
comment on column notify.messages.sent_at is 'When the channel accepted it';
comment on column notify.messages.opened_at is 'When the site was opened from it';
comment on column notify.messages.practised_at is 'When the student practised within two hours of it';
comment on column notify.messages.created_at is 'When it was planned';

grant select, insert, update, delete on notify.prefs, notify.push_subs, notify.activity to cat_app;
grant select, update (opened_at, practised_at) on notify.messages to cat_app;
grant select on notify.prefs, notify.activity, notify.messages to cat_readonly;
grant select (id, identity_id, device_id, failures, last_ok_at, created_at) on notify.push_subs to cat_readonly;

select app.lock_out_api_roles('notify');

-- +goose Down
drop table notify.messages;
drop table notify.activity;
drop table notify.push_subs;
drop table notify.prefs;
drop schema notify;
