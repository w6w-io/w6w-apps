import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 12);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Baserow has no idempotency key on either create endpoint, so the runtime must
 * never retry one: a retry writes the rows a second time.
 */
Deno.test("index: the create actions are not idempotent", () => {
  for (const key of ["row-create", "rows-create-batch"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — otherwise a
 * doc comment explaining why an action never touches the credential trips the
 * assertion, and deleting the explanation "fixes" it.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
  }
});

/**
 * Baserow's credential header is `Authorization: Token …`. The generic check
 * above would miss a hand-built `Token ` prefix, so it is banned by name.
 *
 * The token is banned as a *value* — read as a property, assigned, or built into
 * a header — rather than as the word. Several actions legitimately say "token"
 * in a user-facing hint ("every table this connection's token can reach"), and a
 * guard that banned the word would force those explanations to be deleted, which
 * is the opposite of what it is for.
 */
Deno.test("index: no action builds a Token header or reads the token value", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/["'`]Token /.test(src), `${a.key}: builds the Token header itself`);
    assert(!/\.token\b/i.test(src), `${a.key}: reads a token property`);
    assert(!/\btoken\s*[:=][^:=]/i.test(src), `${a.key}: binds a token value`);
    assert(!/token-auth/.test(src), `${a.key}: calls the JWT login endpoint`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/**
 * The instance URL is half the credential's identity. It must never be an action
 * param and never a literal — that would let two actions on one Connection
 * address two different Baserows.
 */
Deno.test("index: no action hard-codes an instance host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

Deno.test("index: the instance URL is never an action param", () => {
  const banned = /^(site_?url|base_?url|instance_?url|host|origin|domain|token|api_?key)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: the credential's two parts are auth FIELDS, which is where they belong", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["siteUrl", "token"]);
  assertEquals(fields.find((f) => f.key === "token")?.type, "secret");
  assertEquals(fields.find((f) => f.key === "siteUrl")?.type, "string");
});

/**
 * The auth probe is pinned by path.
 *
 * `all-tables` is the only endpoint whose sole accepted scheme is the database
 * token and the only one needing none of the token's four per-table permissions.
 * If someone swaps it for a table-scoped read, a correctly-scoped write-only
 * token starts reporting as broken — so make them do it deliberately.
 */
Deno.test("index: the auth probe is /api/database/tables/all-tables/", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/database-token.ts", import.meta.url)));
  assert(src.includes("/api/database/tables/all-tables/"), "auth probe moved off all-tables");
});

/**
 * The JWT scheme is deliberately not implemented: `sign` cannot fetch a token,
 * and a JWT means storing a human's password. Nothing may quietly start doing it.
 */
Deno.test("index: nothing calls the JWT login endpoint", async () => {
  for (const dir of ["actions", "auth", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(
        !/["'`][^"'`]*token-auth/.test(src),
        `${dir}/${entry.name}: calls /api/user/token-auth/`,
      );
      assert(!/["'`]JWT /.test(src), `${dir}/${entry.name}: builds a JWT header`);
    }
  }
});

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * Rule 1 of the severity contract: an `unavailable` entry always reports
 * `unknown`, which outranks `ok`, so at any other severity a declared absence
 * pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/**
 * The allowlist has to be `*`: Baserow's own OpenAPI document declares no
 * `servers` block, so the reachable host is the customer's own domain and cannot
 * be enumerated at publish time.
 */
Deno.test("index: the manifest allows any host, because the instance is the host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.baserow");
  assertEquals(manifest.w6w.network.allow, ["*"]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// token\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
