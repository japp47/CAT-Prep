# Build: static Go binaries. Run: distroless (no shell, no package manager), as a non-root user. About 20 MB.
# The image starts the API. The same image runs migrations as a separate step before a deploy, with the owner's
# connection: docker run --entrypoint /migrate -e MIGRATE_DATABASE_URL=... (docs/database.md §2).
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /out/migrate /
ENV ENV=prod
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/api"]
