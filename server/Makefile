# Local development. Settings come from .env (cp .env.example .env).
-include .env
export

.PHONY: db-up db-down db-reset db-psql run migrate test test-int vet image check

db-up:            ## start Postgres in Docker and wait until it answers
	docker compose up -d --wait postgres

db-down:          ## stop Postgres (data is kept)
	docker compose down

db-reset:         ## stop Postgres and delete its data
	docker compose down -v

db-psql:          ## open a SQL prompt on the dev database
	docker compose exec postgres psql -U cat -d cat

run: db-up        ## run the API on http://localhost:$(PORT)
	go run ./cmd/api

migrate: db-up    ## apply migrations and exit
	go run ./cmd/api -migrate

vet:
	go vet ./...

test:             ## unit tests (no database needed)
	go test ./...

test-int: db-up   ## unit and integration tests against the cat_test database
	go test -count=1 ./...

image:            ## build the production image
	docker build -t cat-prep-api .

check: vet test-int
