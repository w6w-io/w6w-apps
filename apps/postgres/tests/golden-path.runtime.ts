/**
 * T2.1.2's proof case: drives `@w6w/runtime`'s `invoke()` (and, for the
 * health check, the same `openConnectionSocket` + `runHook` primitives
 * `invoke()` itself composes) against the devcontainer's REAL `postgres`
 * compose service — real DNS resolution, a real `Deno.connect`, real
 * SCRAM-SHA-256. No mock, no fake listener: `tests/actions/*.test.ts` and
 * `tests/health/service.test.ts` already prove the app's own logic against
 * hand-built wire fixtures; this file is the independent oracle that a real
 * PostgreSQL 16 server actually accepts what this app sends and rejects what
 * it should.
 *
 * ## `allowPrivate: true` — not a workaround
 *
 * `Deno.resolveDns("postgres", "A")` resolves to `172.20.0.5`, RFC 1918
 * private space (measured at this node's planning time — see this node's
 * contract, "Context" section). That is expected: this is the "legitimate
 * for a self-hosted deployment reaching its own co-located DB, but never
 * implicit" case the intake's F-1 item 3 committed to, exercised for real
 * here — not something a later reader should "clean up" by trying to make
 * the target look public.
 *
 * ## Write discipline
 *
 * The devcontainer's `postgres` service is the shared dev database. Every
 * statement below is either `SELECT`-only or `CREATE TEMP TABLE` (visible
 * only to the session that created it, gone when that socket closes) — never
 * `CREATE TABLE`, `DROP`, `UPDATE` or `DELETE` against anything that existed
 * before this file ran. `deno task e2e` (a `server` task, a different
 * boundary entirely) is never invoked here.
 *
 * ## One session per `invoke()`
 *
 * A temp table created in one `invoke()` is gone by the next — the socket
 * closes with the invocation (T1.2.2's `finally`). So (e)'s create+insert+
 * select-back all happen inside ONE multi-statement `sql` value, and the
 * isolation test below deliberately tries to see that same temp table from
 * a SECOND `invoke()`, expecting it to be gone.
 */
import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "./_assert.ts";
import {
  invoke,
  loadApp,
  type LoadedApp,
  openConnectionSocket,
  runHook,
  W6WError,
} from "@w6w/runtime";
import { type Connection, type ConnectionTarget, type HealthReport, redact } from "@w6w/types";

const APP_DIR = new URL("../", import.meta.url).pathname;
// The devcontainer's `postgres` compose service by default. Apps CI has no such name, so it runs a
// Postgres 16 service container and points this at it with an IP literal
// (W6W_TEST_PG_HOST=127.0.0.1) — `checkTarget` takes a literal without DNS, and `allowPrivate`
// below admits loopback the same way it admits the compose network's RFC 1918 address.
const HOST = Deno.env.get("W6W_TEST_PG_HOST") || "postgres";
const PORT = 5432;
const DATABASE = "postgres";

const baseTarget: ConnectionTarget = {
  host: HOST,
  port: PORT,
  database: DATABASE,
  tlsMode: "disable",
  allowPrivate: true,
};

function connectionFor(
  target: ConnectionTarget,
  credential: Record<string, unknown> = { user: "postgres", password: "postgres" },
): Connection {
  return {
    manifestVersion: "1",
    id: "conn_postgres_golden_path",
    app: "io.w6w.postgres",
    auth: "postgres",
    owner: "user_golden_path",
    state: "connected",
    credential,
    createdAt: new Date().toISOString(),
    target,
  };
}

function inv(action: string, params?: Record<string, unknown>) {
  return { manifestVersion: "1", app: "io.w6w.postgres", action, params };
}

let appPromise: Promise<LoadedApp> | undefined;
function app(): Promise<LoadedApp> {
  return appPromise ??= loadApp(APP_DIR);
}

// (a) — the whole stack, end to end, with real SCRAM.
test("(a) query: real SCRAM-SHA-256 login, real rows back from the live server", async () => {
  const result = await invoke(await app(), inv("query", { sql: "select 1 as one" }), {
    connection: connectionFor(baseTarget),
  });
  // Postgres's wire protocol is text-format; this app never coerces column
  // values, so `1` genuinely comes back as the string `"1"` — see
  // `lib/wire.ts`'s `parseDataRow` doc comment.
  assertEquals(result.value, { rows: [{ one: "1" }], rowCount: 1, command: "SELECT 1" });
});

// (b) — the single most load-bearing assertion in this node: a server that
// accepted a wrong password would satisfy every OTHER SCRAM assertion too.
test("(b) query: a wrong password is refused by the live server as connection_broken", async () => {
  const wrong = connectionFor(baseTarget, { user: "postgres", password: "definitely-wrong" });
  const loaded = await app();
  const err = await assertRejects(
    () => invoke(loaded, inv("query", { sql: "select 1" }), { connection: wrong }),
    W6WError,
  );
  assertEquals(err.code, "connection_broken");
});

// (c) — the "never implicit" stance, against the real private target.
test("(c) query: allowPrivate removed is denied as socket_denied, against the real 172.20.0.5 target", async () => {
  const { allowPrivate: _drop, ...withoutAllowPrivate } = baseTarget;
  const loaded = await app();
  const err = await assertRejects(
    () =>
      invoke(loaded, inv("query", { sql: "select 1" }), {
        connection: connectionFor(withoutAllowPrivate),
      }),
    W6WError,
  );
  assertEquals(err.code, "socket_denied");
});

// (d) — real-server error handling: a clean rejection, not a hang or empty rows.
test("(d) query: a nonexistent table surfaces the server's ErrorResponse cleanly", async () => {
  const loaded = await app();
  const err = await assertRejects(
    () =>
      invoke(loaded, inv("query", { sql: "select * from golden_path_table_absent_12345" }), {
        connection: connectionFor(baseTarget),
      }),
    Error,
  );
  assert(
    String(err.message).includes("golden_path_table_absent_12345"),
    `expected the server's own message, got: ${err.message}`,
  );
});

// (e) — the write path and multi-result parsing, inside one session.
// `execute` deliberately returns { rowCount, command } and never a row set
// (see actions/execute.ts's doc comment), so "the inserted values come
// back" is proven by the round trip itself: the final SELECT's command tag
// and rowCount exactly match the two rows this same statement just
// inserted, which could only happen if the CREATE + INSERT + SELECT all ran
// in the same session against the same temp table.
test("(e) execute: CREATE TEMP TABLE + INSERT + SELECT in one multi-statement sql, all in one session", async () => {
  const result = await invoke(
    await app(),
    inv("execute", {
      sql: "CREATE TEMP TABLE golden_path_t (v int); " +
        "INSERT INTO golden_path_t VALUES (11), (22); " +
        "SELECT v FROM golden_path_t ORDER BY v;",
    }),
    { connection: connectionFor(baseTarget) },
  );
  assertEquals(result.value, { rowCount: 2, command: "SELECT 2" });
});

// Acceptance: "the connection is closed when invoke resolves" — proven by a
// SECOND, independent invoke() (a new socket, a new session) failing to see
// the temp table the FIRST invoke() created: if the socket had leaked
// rather than closed, pg_temp would still hold it and this table would
// exist. Same mechanism the mutation-discrimination table pins under
// "socket leaked / not closed".
test("isolation: a temp table from a prior invoke() is gone in a fresh one — the socket really closed", async () => {
  const loaded = await app();
  await invoke(
    loaded,
    inv("execute", { sql: "CREATE TEMP TABLE golden_path_isolation (v int);" }),
    { connection: connectionFor(baseTarget) },
  );
  const err = await assertRejects(
    () =>
      invoke(loaded, inv("query", { sql: "select * from golden_path_isolation" }), {
        connection: connectionFor(baseTarget),
      }),
    Error,
  );
  assert(
    String(err.message).includes("golden_path_isolation"),
    `expected "relation does not exist" for a table scoped to the prior, now-closed session, got: ${err.message}`,
  );
});

// (f) — the NULL-vs-empty-string distinction, against the real wire.
test("(f) query: NULL and empty string come back distinct", async () => {
  const result = await invoke(
    await app(),
    inv("query", { sql: "select null::text as a, ''::text as b" }),
    { connection: connectionFor(baseTarget) },
  );
  const rows = (result.value as { rows: Array<Record<string, unknown>> }).rows;
  assertEquals(rows, [{ a: null, b: "" }]);
  assert(rows[0].a === null, 'a must be null, not the string "null" or undefined');
  assert(rows[0].b === "", "b must be the empty string, not null");
});

// (g) — buffered reassembly against a real, busy wire: the assertion a
// one-read-per-frame parser survives in unit tests and dies on here.
test("(g) query: a result spanning many reads (5000 rows) comes back complete", async () => {
  const result = await invoke(
    await app(),
    inv("query", { sql: "select generate_series(1,5000)" }),
    { connection: connectionFor(baseTarget) },
  );
  const rows = (result.value as { rows: Array<Record<string, unknown>>; rowCount: number }).rows;
  assertEquals(rows.length, 5000);
  assertEquals(rows[0], { generate_series: "1" });
  assertEquals(rows[4999], { generate_series: "5000" });
});

// (h) — credential isolation, observed on the live path: ctx.connection, as
// the action itself sees it (captured via ctx.log — actions/execute.ts logs
// it on every call), never carries the credential.
test("(h) execute: ctx.connection, as observed inside the sandbox, carries no credential key", async () => {
  const logs: Array<{ level: string; message: string; data?: unknown }> = [];
  await invoke(
    await app(),
    inv("execute", { sql: "select 1" }),
    {
      connection: connectionFor(baseTarget),
      onLog: (level, message, data) => logs.push({ level, message, data }),
    },
  );
  const entry = logs.find((l) => l.message === "postgres: execute invoked");
  assert(entry, "expected actions/execute.ts's ctx.log call to have fired");
  const seenConnection = (entry!.data as { connection?: Record<string, unknown> }).connection;
  assert(seenConnection, "expected ctx.connection to be present");
  assert(!("credential" in seenConnection!), "ctx.connection must never carry a credential key");
});

// (i) — the health check discriminates in both directions. `checkHealth()`
// (the reference host's own convenience wrapper, `@w6w/runtime`'s
// `checkHealth`) never opens a socket for ANY health check today — verified
// by reading `packages/runtime/src/health.ts`'s `runHealthHook`, which never
// passes `onSocket` to `runHook` (a gap in the current runtime surface, not
// something this app or this node can fix — see health/service.ts's doc
// comment and this node's result). So this helper composes the same two
// primitives `invoke()` itself uses (`openConnectionSocket` then `runHook`)
// directly, pointed at the health selector instead of an action — proving
// `health/service.ts`'s own probe logic against the live server today, in
// exactly the shape a fixed `checkHealth()` would need tomorrow.
async function checkHealthLive(connection: Connection): Promise<HealthReport> {
  const loadedApp = await app();
  const auth = loadedApp.auths.find((a) => a.auth.key === connection.auth) ?? loadedApp.auths[0];
  let session;
  try {
    session = await openConnectionSocket(
      loadedApp,
      auth,
      connection.target!,
      connection.credential,
      {},
    );
  } catch (err) {
    // Standing in for what a fixed checkHealth() should do once it wires a
    // socket into a health-check invocation: a failed connect/handshake IS
    // "unhealthy", exactly as it is an action's own rejection today.
    return { state: "down", message: (err as Error).message };
  }
  try {
    return await runHook<HealthReport>({
      entryPath: loadedApp.entryPath,
      selector: { kind: "health", key: "service" },
      input: {},
      readScope: loadedApp.dir,
      connection: redact(connection),
      onSocket: session.onSocket,
    });
  } finally {
    session.close();
  }
}

test("(i) health service: reports ok against the live database", async () => {
  const report = await checkHealthLive(connectionFor(baseTarget));
  assertEquals(report.state, "ok");
});

test("(i) health service: pointed at a closed port, reports down — not unknown", async () => {
  const closedPortTarget: ConnectionTarget = { ...baseTarget, port: 5599 };
  const report = await checkHealthLive(connectionFor(closedPortTarget));
  assertEquals(report.state, "down");
});
