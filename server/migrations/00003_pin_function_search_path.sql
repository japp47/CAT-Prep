-- Pin the search path of app.touch_updated_at, so a table or function with the same name in another schema
-- can never change what the trigger runs (Supabase security advisor 0011). now() is in pg_catalog, which is
-- always searched, so an empty path is enough.

-- +goose Up
alter function app.touch_updated_at() set search_path = '';

-- +goose Down
alter function app.touch_updated_at() reset search_path;
