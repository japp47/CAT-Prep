-- Linking devices and getting progress back (docs/architecture.md §5.1, docs/database.md §6, B4).
-- Codes are random and long enough that SHA-256 is a safe store; only the hash is kept, hidden from cat_readonly.

-- +goose Up
create table account.recovery_codes (
  identity_id uuid primary key references account.identities (id) on delete cascade,
  code_hash   bytea not null check (octet_length(code_hash) = 32),
  created_at  timestamptz not null default now()
);
create unique index recovery_codes_code_hash_idx on account.recovery_codes (code_hash);

comment on table account.recovery_codes is 'One recovery code per identity; making a new one replaces the row, so the old code stops working';
comment on column account.recovery_codes.identity_id is 'Whose progress the code brings back';
comment on column account.recovery_codes.code_hash is 'SHA-256 of the 16-character code. Hidden from cat_readonly';
comment on column account.recovery_codes.created_at is 'When this code was made';

create table account.link_codes (
  code_hash            bytea primary key check (octet_length(code_hash) = 32),
  identity_id          uuid not null references account.identities (id) on delete cascade,
  created_by_device_id uuid references account.devices (id) on delete set null,
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null,
  used_at              timestamptz,
  used_by_device_id    uuid references account.devices (id) on delete set null,
  check (expires_at > created_at),
  check (used_by_device_id is null or used_at is not null)
);
create index link_codes_identity_id_idx on account.link_codes (identity_id);
create index link_codes_expires_at_idx on account.link_codes (expires_at);

comment on table account.link_codes is 'Short codes shown as a QR to add a device; 10 minutes, used once, deleted a day after expiry';
comment on column account.link_codes.code_hash is 'SHA-256 of the 8-character code. Hidden from cat_readonly';
comment on column account.link_codes.identity_id is 'The identity the new device joins';
comment on column account.link_codes.created_by_device_id is 'The device that showed the code';
comment on column account.link_codes.created_at is 'When the code was made';
comment on column account.link_codes.expires_at is 'After this the code no longer works';
comment on column account.link_codes.used_at is 'When a device used it; a used code never works again';
comment on column account.link_codes.used_by_device_id is 'The device that joined with it';

revoke select on account.recovery_codes, account.link_codes from cat_readonly;
grant select (identity_id, created_at) on account.recovery_codes to cat_readonly;
grant select (identity_id, created_by_device_id, created_at, expires_at, used_at, used_by_device_id) on account.link_codes to cat_readonly;

select app.lock_out_api_roles('account');

-- +goose Down
drop table account.link_codes;
drop table account.recovery_codes;
