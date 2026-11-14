-- The stage an article set is at (F34, D104), so the site's progress bar moves with the real work: in line, writing
-- the questions, checking them, or a short pause while the AI provider's limit clears.

-- +goose Up
alter table ai.jobs add column stage text not null default 'queued' check (stage in ('queued', 'writing', 'checking', 'waiting'));

-- +goose Down
alter table ai.jobs drop column stage;
