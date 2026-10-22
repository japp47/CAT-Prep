# Local development. Settings come from .env (cp .env.example .env).
-include .env
export

.PHONY: db-up db-down db-reset db-psql dev-passwords run migrate migrate-status migrate-prod migrate-prod-status cleanup-prod test test-int vet image check

db-up:            ## start Postgres in Docker and wait until it answers
	docker compose up -d --wait postgres

db-down:          ## stop Postgres (data is kept)
	docker compose down

db-reset:         ## stop Postgres and delete its data
	docker compose down -v

db-psql:          ## open a SQL prompt on the dev database
	docker compose exec postgres psql -U cat -d cat

run: migrate      ## migrate, then run the API (as cat_app) on http://localhost:$(PORT)
	go run ./cmd/api

migrate: db-up    ## apply new migrations as the owner, then set the local-only passwords
	go run ./cmd/migrate
	@$(MAKE) --no-print-directory dev-passwords

migrate-status:   ## the database's schema version and the one this code expects
	go run ./cmd/migrate -status

# Live database (Supabase). The owner's link lives in .env.prod, which Git and Docker ignore. Each target runs in
# its own shell, so the live link never mixes with the local settings above.
PROD = set -a && . ./.env.prod && set +a && echo "Database: $$(echo "$$MIGRATE_DATABASE_URL" | sed -E 's|^[^@]*@||; s|\?.*||')" &&

migrate-prod:     ## apply new migrations to the live database (link in .env.prod)
	@test -f .env.prod || { echo "No .env.prod. See 'Live database' in README.md."; exit 1; }
	@$(PROD) go run ./cmd/migrate

migrate-prod-status: ## the live database's schema version
	@test -f .env.prod || { echo "No .env.prod. See 'Live database' in README.md."; exit 1; }
	@$(PROD) go run ./cmd/migrate -status

cleanup-prod:     ## delete expired link codes, old removed devices and old audit events on the live database
	@test -f .env.prod || { echo "No .env.prod. See 'Live database' in README.md."; exit 1; }
	@$(PROD) go run ./cmd/cleanup

# Local only: the roles are created by migration 00002 without a password. Live passwords are set by hand.
dev-passwords:
	@docker compose exec -T postgres psql -qU cat -d cat -c "alter role cat_app password 'cat_app'" -c "alter role cat_readonly password 'cat_readonly'"

vet:
	go vet ./...

test:             ## unit tests (no database needed)
	go test ./...

test-int: db-up   ## unit and integration tests against the cat_test database
	go test -count=1 ./...

image:            ## build the production image (contains /api and /migrate)
	docker build -t cat-prep-api .

check: vet test-int
