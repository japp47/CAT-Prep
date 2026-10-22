-- The server limits a record to 16 KB of JSON as the browser sends it. Postgres stores jsonb with a space after every
-- ":" and ",", so the stored text can be longer than what was sent (at most about twice as long). The column check
-- now allows for that, so a record the server accepted can never fail here (docs/database.md §5.4).

-- +goose Up
alter table sync.records drop constraint records_data_check;
alter table sync.records add constraint records_data_check check (octet_length(data::text) <= 32768);

-- +goose Down
alter table sync.records drop constraint records_data_check;
alter table sync.records add constraint records_data_check check (octet_length(data::text) <= 16384) not valid;
