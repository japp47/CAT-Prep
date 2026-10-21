# Build: a static Go binary. Run: distroless (no shell, no package manager), as a non-root user. About 15 MB.
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
ENV ENV=prod
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/api"]
