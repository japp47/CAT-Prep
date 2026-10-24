-- Accounts: Google sign-in (docs/architecture.md §5.2, docs/database.md §6, B7). An account owns exactly one
-- identity, so sync is unchanged: signing in only decides which identity a device points at (D27).
-- Staff roles (schema access) come with the admin page in B8 (D28).

-- +goose Up
create table account.users (
  id              uuid primary key,
  identity_id     uuid not null unique references account.identities (id) on delete cascade,
  email           text not null check (length(email) between 3 and 320),
  email_verified  boolean not null,
  display_name    text not null default '' check (length(display_name) <= 100),
  last_sign_in_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index users_email_idx on account.users (lower(email));

comment on table account.users is 'A signed-in account. Owns exactly one identity; deleting the identity deletes the account';
comment on column account.users.id is 'uuid v7, made by the server';
comment on column account.users.identity_id is 'The progress this account owns';
comment on column account.users.email is 'From Google, to show "Signed in as". Not unique: Google accounts are told apart by subject';
comment on column account.users.email_verified is 'Google said the email is verified; sign-in needs it';
comment on column account.users.display_name is 'The name Google gave, if any';
comment on column account.users.last_sign_in_at is 'Last sign-in on any device';
comment on column account.users.created_at is 'First sign-in';
comment on column account.users.updated_at is 'Last change to email or name';

create table account.oauth_accounts (
  provider   text not null check (provider in ('google')),
  subject    text not null check (length(subject) between 1 and 255),
  user_id    uuid not null references account.users (id) on delete cascade,
  email      text not null default '' check (length(email) <= 320),
  created_at timestamptz not null default now(),
  primary key (provider, subject)
);
create index oauth_accounts_user_id_idx on account.oauth_accounts (user_id);

comment on table account.oauth_accounts is 'Which Google account signs in to which 99ile account. Subject is Google''s stable id';
comment on column account.oauth_accounts.provider is 'google; more providers need no schema change';
comment on column account.oauth_accounts.subject is 'The provider''s user id (the ID token''s sub)';
comment on column account.oauth_accounts.user_id is 'The 99ile account';
comment on column account.oauth_accounts.email is 'The email the provider gave at the last sign-in';
comment on column account.oauth_accounts.created_at is 'When this Google account was first used';

create table account.signin_tickets (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  provider   text not null check (provider in ('google')),
  subject    text not null check (length(subject) between 1 and 255),
  email      text not null check (length(email) <= 320),
  name       text not null default '' check (length(name) <= 100),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  check (expires_at > created_at)
);
create index signin_tickets_expires_at_idx on account.signin_tickets (expires_at);

comment on table account.signin_tickets is 'One-time hand-over from the Google callback to the question "save this device''s progress?"; 10 minutes, used once';
comment on column account.signin_tickets.token_hash is 'SHA-256 of the ticket. Hidden from cat_readonly';
comment on column account.signin_tickets.provider is 'google';
comment on column account.signin_tickets.subject is 'The verified Google user id';
comment on column account.signin_tickets.email is 'The verified email';
comment on column account.signin_tickets.name is 'The name Google gave';
comment on column account.signin_tickets.created_at is 'When Google sent the student back';
comment on column account.signin_tickets.expires_at is 'After this the ticket no longer works';
comment on column account.signin_tickets.used_at is 'When it was used; a used ticket never works again';

revoke select on account.signin_tickets from cat_readonly;
grant select (provider, created_at, expires_at, used_at) on account.signin_tickets to cat_readonly;

select app.lock_out_api_roles('account');

-- +goose Down
drop table account.signin_tickets;
drop table account.oauth_accounts;
drop table account.users;
