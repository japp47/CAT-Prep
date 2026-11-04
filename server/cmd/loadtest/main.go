// Command loadtest replays 10,000 students against a local API (docs/design/scale-10k.md, phase 0). It never touches
// the live database: -db must name a local owner connection, and it works in its own database, cat_load.
//
//	go run ./cmd/loadtest -seed -students 10000            # create the students and their history, report the size
//	go run ./cmd/loadtest -run 2m -rate 12 -lag 1ms         # an evening peak against the API on -api
//
// Students are made straight in the database, the way sign-up makes them (a random 32-byte cookie secret; only its
// SHA-256 is stored), because sign-up is rate limited per address. Every sync call then goes through the real API.
// -lag starts a TCP proxy in front of Postgres that delays each read by that much, so the database round trips cost
// what they cost on Render talking to Supabase; point the API's DATABASE_URL at -lagaddr.
package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"log/slog"
	"math"
	mrand "math/rand/v2"
	"net"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/japp47/CAT-Prep/server/internal/ids"
	"github.com/japp47/CAT-Prep/server/internal/store"
	"github.com/japp47/CAT-Prep/server/migrations"
)

var (
	ownerURL = flag.String("db", "postgres://cat:cat@localhost:5433/cat?sslmode=disable", "local owner connection (any database; cat_load is created beside it)")
	apiURL   = flag.String("api", "http://localhost:8091", "the API to load")
	seed     = flag.Bool("seed", false, "create cat_load, its students and their history")
	students = flag.Int("students", 10_000, "students to create with -seed")
	heavyPct = flag.Float64("heavy", 0.2, "share of serious students (about 3,500 records each; the rest about 500)")
	runFor   = flag.Duration("run", 0, "how long to replay the peak")
	rate     = flag.Float64("rate", 12, "sessions started per second during the peak")
	lag      = flag.Duration("lag", 0, "delay added to each database read by a proxy (models the network to the database)")
	lagAddr  = flag.String("lagaddr", "127.0.0.1:5434", "where the lag proxy listens")
	keysFile = flag.String("keys", "loadtest-students.json", "the students' cookies, written by -seed")
	bigPush  = flag.Int("bigpush", 0, "also time this many full pushes of 200 new records (a long history turning sync on)")
)

type student struct {
	Identity string `json:"i"`
	Cookie   string `json:"c"`
	Heavy    bool   `json:"h"`
}

func main() {
	flag.Parse()
	ctx := context.Background()
	u, err := url.Parse(*ownerURL)
	if err != nil || !strings.Contains(u.Host, "localhost") && !strings.HasPrefix(u.Host, "127.") {
		log.Fatal("-db must be a local database")
	}
	if *lag > 0 {
		go lagProxy(*lagAddr, u.Host, *lag)
		log.Printf("lag proxy on %s → %s, %s per read", *lagAddr, u.Host, *lag)
	}
	if *seed {
		doSeed(ctx, u)
	}
	if *runFor > 0 {
		doRun(ctx, u)
	}
	if *lag > 0 && *runFor == 0 && !*seed {
		select {} // proxy only
	}
}

// ---------------------------------------------------------------- seeding

func loadDB(u *url.URL) string { v := *u; v.Path = "/cat_load"; return v.String() }

func doSeed(ctx context.Context, u *url.URL) {
	admin, err := pgx.Connect(ctx, u.String())
	if err != nil {
		log.Fatal(err)
	}
	_, _ = admin.Exec(ctx, "drop database if exists cat_load with (force)")
	if _, err := admin.Exec(ctx, "create database cat_load"); err != nil {
		log.Fatal(err)
	}
	admin.Close(ctx)
	pool, err := store.Open(ctx, loadDB(u))
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := store.Migrate(ctx, pool, migrations.FS, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		log.Fatal(err)
	}
	if _, err := pool.Exec(ctx, "alter role cat_app password 'cat_app'"); err != nil {
		log.Fatal(err)
	}

	start := time.Now()
	keys := make([]student, *students)
	var idents, devices, heads [][]any
	for i := range keys {
		b := make([]byte, 32)
		_, _ = rand.Read(b)
		h := sha256.Sum256(b)
		id := ids.New()
		keys[i] = student{Identity: id, Cookie: base64.RawURLEncoding.EncodeToString(b), Heavy: mrand.Float64() < *heavyPct}
		idents = append(idents, []any{id})
		devices = append(devices, []any{ids.New(), id, h[:], "Chrome on Android", "android"})
		heads = append(heads, []any{id})
	}
	copyIn(ctx, pool, "account", "identities", []string{"id"}, idents)
	copyIn(ctx, pool, "account", "devices", []string{"id", "identity_id", "secret_hash", "label", "platform"}, devices)
	copyIn(ctx, pool, "sync", "heads", []string{"identity_id"}, heads)

	// History, in chunks of students so memory stays small.
	total := 0
	for lo := 0; lo < len(keys); lo += 200 {
		var rows [][]any
		for _, s := range keys[lo:min(lo+200, len(keys))] {
			rows = append(rows, history(s)...)
		}
		copyIn(ctx, pool, "sync", "records", []string{"identity_id", "kind", "rec_id", "data", "deleted", "stamp"}, rows)
		total += len(rows)
	}
	if _, err := pool.Exec(ctx, `update sync.heads h set rev = r.rev, record_count = r.n, data_bytes = r.b
		from (select identity_id, max(rev) rev, count(*) n, sum(data_bytes) b from sync.records group by identity_id) r
		where r.identity_id = h.identity_id`); err != nil {
		log.Fatal(err)
	}
	_, _ = pool.Exec(ctx, "vacuum analyze")
	f, _ := os.Create(*keysFile)
	_ = json.NewEncoder(f).Encode(keys)
	_ = f.Close()

	var recBytes, idxBytes, toast int64
	_ = pool.QueryRow(ctx, `select pg_table_size('sync.records'), pg_indexes_size('sync.records'),
		coalesce(pg_total_relation_size(reltoastrelid), 0) from pg_class where oid = 'sync.records'::regclass`).Scan(&recBytes, &idxBytes, &toast)
	var dataBytes int64
	_ = pool.QueryRow(ctx, `select sum(data_bytes) from sync.records`).Scan(&dataBytes)
	n := float64(len(keys))
	fmt.Printf("\nSeeded %d students (%d serious), %d records in %s\n", len(keys), count(keys), total, time.Since(start).Round(time.Second))
	fmt.Printf("sync.records: table %s (toast %s), indexes %s, total %s\n", mb(recBytes), mb(toast), mb(idxBytes), mb(recBytes+idxBytes))
	fmt.Printf("JSON sent by browsers: %s; stored per student: %.0f KB (%.0f bytes per record)\n", mb(dataBytes), float64(recBytes+idxBytes)/n/1024, float64(recBytes+idxBytes)/float64(total))
}

func count(k []student) (n int) {
	for _, s := range k {
		if s.Heavy {
			n++
		}
	}
	return
}

func mb(b int64) string { return fmt.Sprintf("%.0f MB", float64(b)/(1<<20)) }

func copyIn(ctx context.Context, pool *pgxpool.Pool, schema, table string, cols []string, rows [][]any) {
	if _, err := pool.CopyFrom(ctx, pgx.Identifier{schema, table}, cols, pgx.CopyFromRows(rows)); err != nil {
		log.Fatalf("copy %s.%s: %v", schema, table, err)
	}
}

// history makes a student's records in the shapes the browser sends (docs/design/scale-10k.md §2): per study day
// two RC attempts, a VA drill, an LR attempt, practice rows, redo items, the day record, sometimes an error.
func history(s student) [][]any {
	days := 120
	if s.Heavy {
		days = 300
	}
	var rows [][]any
	add := func(kind, id string, data string) {
		rows = append(rows, []any{s.Identity, kind, id, data, false, int64(1_770_000_000_000 + len(rows))})
	}
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	for d := 0; d < days; d++ {
		day := start.AddDate(0, 0, d).Format("2006-01-02")
		n := 1
		if s.Heavy {
			n = 2
		}
		for k := 0; k < n; k++ {
			id := ids.New()
			add("rc", id, fmt.Sprintf(`{"id":%q,"d":%q,"set":"sci-ozone","mode":"daily","ans":[2,1,0,3],"c":3,"w":1,"secs":612,"first":148,"v":"a1b2c3d4","updatedAt":1773500000000}`, id, day))
			add("practice", id+"p", fmt.Sprintf(`{"id":"%sp","d":%q,"sec":"VARC","t":"RC","a":4,"c":3,"src":"Practice: The hole that is closing"}`, id, day))
			add("redo", fmt.Sprintf("rc:sci-ozone:%d:%s", k, day), fmt.Sprintf(`{"k":"rc:sci-ozone:2","added":%q,"due":%q,"box":1,"tries":1,"last":%q}`, day, day, day))
		}
		if s.Heavy {
			id := ids.New()
			add("va", id, fmt.Sprintf(`{"id":%q,"d":%q,"mode":"daily","items":[{"k":"pj:bees","a":"3142","ok":true,"pts":3,"v":"a1b2c3d4"},{"k":"ps:ants","a":"2","ok":false,"pts":0,"v":"a1b2c3d4"},{"k":"oo:moon","a":"4","ok":true,"pts":3,"v":"a1b2c3d4"}],"secs":540}`, id, day))
			id = ids.New()
			add("lr", id, fmt.Sprintf(`{"id":%q,"d":%q,"set":"arr-round-table","ans":[1,"4",2,null,0],"c":3,"w":1,"secs":1020,"updatedAt":1773500000000,"v":"a1b2c3d4","qs":[200,180,240,150,250],"pm":{"key":2,"time":"cases","slip":"misread"}}`, id, day))
			add("practice", id+"p", fmt.Sprintf(`{"id":"%sp","d":%q,"sec":"DILR","t":"LR","a":4,"c":3,"src":"Practice: Six friends at a round table"}`, id, day))
			add("redo", "lr:arr-round-table:3:"+day, fmt.Sprintf(`{"k":"lr:arr-round-table:3","added":%q,"due":%q,"box":1,"tries":1}`, day, day))
			if d%3 == 0 {
				id = ids.New()
				add("error", id, fmt.Sprintf(`{"id":%q,"d":%q,"sec":"VARC","t":"RC: inference","trap":"Extreme wording","src":"RC: The hole that is closing, Q3","why":"Picked the strongest option","fix":"Check qualifiers","cause":"trap"}`, id, day))
			}
		}
		add("day", day, `{"min":{"varc":60,"dilr":30},"done":{"varc:b1":20,"varc:b2":20,"dilr:b1":30},"auto":["varc:b1"]}`)
	}
	return rows
}

// ---------------------------------------------------------------- the peak

type op struct {
	name string
	mu   sync.Mutex
	lat  []time.Duration
	errs atomic.Int64
}

func (o *op) add(d time.Duration, ok bool) {
	if !ok {
		o.errs.Add(1)
		return
	}
	o.mu.Lock()
	o.lat = append(o.lat, d)
	o.mu.Unlock()
}

type state struct {
	student
	mu     sync.Mutex
	cursor int64
	day    string
	dayRev int64
}

func doRun(ctx context.Context, u *url.URL) {
	var keys []student
	f, err := os.Open(*keysFile)
	if err != nil {
		log.Fatal("no students: run with -seed first")
	}
	_ = json.NewDecoder(f).Decode(&keys)
	_ = f.Close()
	pool, err := store.Open(ctx, loadDB(u))
	if err != nil {
		log.Fatal(err)
	}
	sts := make([]*state, len(keys))
	byID := map[string]*state{}
	for i, k := range keys {
		sts[i] = &state{student: k}
		byID[k.Identity] = sts[i]
	}
	// Each browser knows its cursor and its last day record's rev, as a real one does.
	rows, _ := pool.Query(ctx, `select h.identity_id::text, h.rev, r.rec_id, r.rev from sync.heads h
		join lateral (select rec_id, rev from sync.records where identity_id = h.identity_id and kind = 'day' order by rec_id desc limit 1) r on true`)
	for rows.Next() {
		var id, day string
		var cur, rev int64
		_ = rows.Scan(&id, &cur, &day, &rev)
		if s := byID[id]; s != nil {
			s.cursor, s.day, s.dayRev = cur, day, rev
		}
	}
	rows.Close()
	pool.Close()

	client := &http.Client{Timeout: 30 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: 512}}
	ops := map[string]*op{"pull, nothing new": {name: "pull, nothing new"}, "push": {name: "push"}, "pull, new device page": {name: "pull, new device page"}}
	call := func(s *state, path string, body any, out any) (time.Duration, bool) {
		b, _ := json.Marshal(body)
		req, _ := http.NewRequest("POST", *apiURL+path, strings.NewReader(string(b)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Cookie", "__Host-dev="+s.Cookie)
		t := time.Now()
		resp, err := client.Do(req)
		if err != nil {
			return 0, false
		}
		defer resp.Body.Close()
		if out != nil {
			_ = json.NewDecoder(resp.Body).Decode(out)
		} else {
			_, _ = io.Copy(io.Discard, resp.Body)
		}
		return time.Since(t), resp.StatusCode == 200
	}

	session := func(s *state) {
		if !s.mu.TryLock() {
			return // a real student's device does one round at a time
		}
		defer s.mu.Unlock()
		r := mrand.Float64()
		switch {
		case r < 0.05: // a new device: pull everything, a page at a time
			cur := int64(0)
			for {
				var out struct {
					Cursor int64
					More   bool
				}
				d, ok := call(s, "/v1/sync/pull", map[string]int64{"cursor": cur}, &out)
				ops["pull, new device page"].add(d, ok)
				if !ok || !out.More {
					return
				}
				cur = out.Cursor
			}
		default: // focus or a finished set: a pull that finds nothing, then (70%) a push
			var pull struct{ Cursor int64 }
			d, ok := call(s, "/v1/sync/pull", map[string]int64{"cursor": s.cursor}, &pull)
			ops["pull, nothing new"].add(d, ok)
			if r > 0.75 {
				return
			}
			n := 3 + mrand.IntN(8)
			var changes []map[string]any
			for i := 0; i < n-1; i++ {
				id := ids.New()
				changes = append(changes, map[string]any{"kind": "rc", "id": id, "stamp": time.Now().UnixMilli(), "baseRev": 0,
					"data": json.RawMessage(fmt.Sprintf(`{"id":%q,"d":%q,"set":"sci-ozone","mode":"library","ans":[2,1,0,3],"c":3,"w":1,"secs":600,"first":140}`, id, s.day))})
			}
			changes = append(changes, map[string]any{"kind": "day", "id": s.day, "stamp": time.Now().UnixMilli(), "baseRev": s.dayRev,
				"data": json.RawMessage(fmt.Sprintf(`{"min":{"varc":60},"done":{"varc:b%d":20}}`, mrand.IntN(9)))})
			var out struct {
				Applied []struct {
					Kind string
					ID   string
					Rev  int64
				}
			}
			d, ok = call(s, "/v1/sync/push", map[string]any{"changes": changes}, &out)
			ops["push"].add(d, ok)
			for _, a := range out.Applied {
				s.cursor = max(s.cursor, a.Rev)
				if a.Kind == "day" {
					s.dayRev = a.Rev
				}
			}
		}
	}

	if *bigPush > 0 {
		o := &op{name: "push of 200 records"}
		for i := 0; i < *bigPush; i++ {
			s := sts[mrand.IntN(len(sts))]
			var changes []map[string]any
			for j := 0; j < 200; j++ {
				id := ids.New()
				changes = append(changes, map[string]any{"kind": "rc", "id": id, "stamp": time.Now().UnixMilli(), "baseRev": 0,
					"data": json.RawMessage(fmt.Sprintf(`{"id":%q,"d":"2026-11-04","set":"sci-ozone","mode":"library","ans":[2,1,0,3],"c":3,"w":1,"secs":600,"first":140}`, id))})
			}
			d, ok := call(s, "/v1/sync/push", map[string]any{"changes": changes}, nil)
			o.add(d, ok)
		}
		sort.Slice(o.lat, func(i, j int) bool { return o.lat[i] < o.lat[j] })
		if len(o.lat) > 0 {
			fmt.Printf("%-24s %7d %7d %8s %8s (median, slowest)\n", o.name, len(o.lat), o.errs.Load(), ms(o.lat[len(o.lat)/2]), ms(o.lat[len(o.lat)-1]))
		}
	}
	log.Printf("peak: %.1f sessions a second for %s, %d students", *rate, *runFor, len(sts))
	var wg sync.WaitGroup
	tick := time.NewTicker(time.Duration(float64(time.Second) / *rate))
	end := time.Now().Add(*runFor)
	started := 0
	for now := range tick.C {
		if now.After(end) {
			break
		}
		wg.Add(1)
		started++
		go func(s *state) { defer wg.Done(); session(s) }(sts[mrand.IntN(len(sts))])
	}
	tick.Stop()
	wg.Wait()

	fmt.Printf("\n%d sessions in %s (%.1f a second), lag %s\n", started, *runFor, float64(started)/runFor.Seconds(), *lag)
	fmt.Printf("%-24s %7s %7s %8s %8s %8s %8s\n", "call", "count", "errors", "p50", "p95", "p99", "max")
	names := []string{"pull, nothing new", "push", "pull, new device page"}
	for _, n := range names {
		o := ops[n]
		sort.Slice(o.lat, func(i, j int) bool { return o.lat[i] < o.lat[j] })
		q := func(p float64) time.Duration {
			if len(o.lat) == 0 {
				return 0
			}
			return o.lat[int(math.Min(float64(len(o.lat)-1), p*float64(len(o.lat))))]
		}
		fmt.Printf("%-24s %7d %7d %8s %8s %8s %8s\n", n, len(o.lat), o.errs.Load(), ms(q(.5)), ms(q(.95)), ms(q(.99)), ms(q(1)))
	}
}

func ms(d time.Duration) string { return fmt.Sprintf("%.1fms", float64(d.Microseconds())/1000) }

// ---------------------------------------------------------------- lag proxy

// lagProxy forwards TCP to Postgres and waits `d` before passing on each chunk read from either side, so every
// query costs about two lags more, as it does over a real network.
func lagProxy(listen, target string, d time.Duration) {
	ln, err := net.Listen("tcp", listen)
	if err != nil {
		log.Fatal(err)
	}
	for {
		c, err := ln.Accept()
		if err != nil {
			continue
		}
		go func() {
			s, err := net.Dial("tcp", target)
			if err != nil {
				_ = c.Close()
				return
			}
			pipe := func(dst, src net.Conn) {
				buf := make([]byte, 64<<10)
				for {
					n, err := src.Read(buf)
					if n > 0 {
						time.Sleep(d)
						if _, werr := dst.Write(buf[:n]); werr != nil {
							break
						}
					}
					if err != nil {
						break
					}
				}
				_ = dst.Close()
				_ = src.Close()
			}
			go pipe(s, c)
			pipe(c, s)
		}()
	}
}
