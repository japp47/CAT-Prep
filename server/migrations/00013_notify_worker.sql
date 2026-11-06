-- The reminder job moves into the API (D91, docs/design/notifications.md §7): the API's role, cat_app, now plans,
-- claims, sends and forgets messages itself. Until now only the owner's connection (cmd/notify) wrote the queue.

-- +goose Up
grant insert (identity_id, kind, channel, dedupe_key, variant, vars, priority, run_at) on notify.messages to cat_app;
grant update (status, run_at, attempts, locked_until, reason, sent_at) on notify.messages to cat_app;
grant delete on notify.messages to cat_app;

-- +goose Down
revoke delete on notify.messages from cat_app;
revoke update (status, run_at, attempts, locked_until, reason, sent_at) on notify.messages from cat_app;
revoke insert (identity_id, kind, channel, dedupe_key, variant, vars, priority, run_at) on notify.messages from cat_app;
