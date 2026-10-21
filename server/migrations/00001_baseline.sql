-- Baseline. The schema starts empty: B2 adds identities, devices and records (docs/architecture.md §9).
-- This file exists so the migration runner has a first version to record.

-- +goose Up
select 1;

-- +goose Down
select 1;
