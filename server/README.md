# Go API

This is the initial Go server setup. It currently exposes only `GET /healthz`.
It has no database, authentication, or sync functionality yet.

Requires Go 1.23 or newer.

From this directory:

```sh
go run ./cmd/api
```

The server listens on port `8080` by default. Set `PORT` to use another port.

```sh
curl http://localhost:8080/healthz
```

Expected response:

```json
{"status":"ok"}
```

Run the server tests with:

```sh
go test ./...
```
