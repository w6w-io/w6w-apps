import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 14;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
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
 * PhantomBuster's launch endpoint accepts no idempotency key of any kind, so
 * every call queues a new run and bills accordingly.
 */
Deno.test("index: agent-launch is the only action marked not idempotent", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  const notIdempotent = performs.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["agent-launch"]);
});

/** The converse: stop/delete are genuinely safe to retry, and saying so is the point. */
Deno.test("index: stop and delete are marked idempotent", () => {
  for (const key of ["agent-stop", "agent-delete"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
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
 * Strip comments so the sandbox guards below scan CODE, not prose — without
 * this, a doc comment explaining why an action never touches the credential
 * would trip the assertion.
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
    assert(!/x-phantombuster-key/i.test(src), `${a.key}: builds the auth header itself`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches the API key`);
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
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host could be pointed somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/phantombuster\.com/.test(src), `${a.key}: contains a PhantomBuster host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the redaction invariant, derived rather than listed ---------------------

/**
 * Every request path an action builds, with `${…}` interpolations collapsed to
 * `{}` — derived from the source rather than hand-listed, so a new action is
 * covered the moment it is written.
 */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

/**
 * The two paths whose responses carry a live credential, read off
 * PhantomBuster's own OpenAPI schema: `GET /orgs/fetch` (unconditional
 * `identityTokens` + `qualificationFlow.sessionCookie`) and `GET /agents/fetch`
 * (unconditional `proxyPassword`). `GET /agents/fetch-deleted` is deliberately
 * NOT in this set — its schema carries no proxy fields at all.
 */
const SECRET_BEARING_PATHS = new Set(["/orgs/fetch", "/agents/fetch"]);

/**
 * The invariant, both ways: an action that touches a secret-bearing path MUST
 * strip, and an action that strips MUST have a reason to. The second half is
 * what stops the rule decaying into a decorative call nobody can justify.
 */
Deno.test("index: exactly the actions touching a secret-bearing path strip secrets", async () => {
  const touching: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (requestPaths(src).some((p) => SECRET_BEARING_PATHS.has(p))) touching.push(a.key);
    if (/\bstripOrgSecrets\s*\(|\bstripAgentSecrets\s*\(/.test(src)) stripping.push(a.key);
  }
  assertEquals(
    touching.slice().sort(),
    stripping.slice().sort(),
    `actions touching a secret-bearing path: ${touching.sort().join(", ")} · ` +
      `actions stripping: ${stripping.sort().join(", ")}`,
  );
  // Two: org-get (/orgs/fetch) and agent-get (/agents/fetch).
  assertEquals(touching.length, 2, `expected 2 secret-bearing actions, found ${touching.length}`);
});

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("agent-get");
  assert(
    requestPaths(src).includes("/agents/fetch"),
    "requestPaths no longer recognises agent-get's literal path — the invariant above is blind",
  );
  assertEquals(requestPaths('const p = "/orgs/fetch";'), ["/orgs/fetch"]);
  // PhantomBuster's v2 surface never interpolates an id into a path (ids travel
  // as query params or body fields instead), so no real action here exercises
  // this collapsing — it is still verified against a synthetic literal.
  assertEquals(requestPaths("const p = `/agents/${id}/foo`;"), ["/agents/{}/foo"]);
});

// --- auth --------------------------------------------------------------------

/**
 * The auth probe is pinned by path. Choosing it is the step where a
 * credential most easily leaks back out: PhantomBuster's obvious whoami,
 * `GET /users/fetch-me`, unconditionally returns a live session id and a
 * Zendesk token. `/orgs/fetch-resources` needs a credential and returns only
 * usage numbers.
 */
Deno.test("index: the auth probe is /orgs/fetch-resources", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/orgs/fetch-resources"), "auth probe no longer hits /orgs/fetch-resources");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/users\/fetch-me["'`]/.test(src),
    "the probe was pointed at the whoami, which mints a session and returns a Zendesk token",
  );
});

/**
 * Nothing in this app calls the whoami at all — not just avoids it as the
 * probe. Pinned by an exact, quote-delimited path literal (the shape a real
 * `ctx.fetch(...)` call argument takes), the same way the auth-app's own
 * `/store` exclusion test is pinned in this pack — a bare substring scan would
 * also flag `WHY_NOT_USERS_FETCH_ME`, a real code string that *documents* the
 * exclusion by naming the path in prose, not by calling it.
 */
Deno.test("index: nothing in auth, health or actions calls /users/fetch-me", async () => {
  for (const dir of ["auth", "health", "actions"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(
        !/["'`]\/users\/fetch-me["'`]/.test(src),
        `${dir}/${entry.name}: calls /users/fetch-me`,
      );
    }
  }
});

/** The precise-literal derivation above actually catches a real call, not just avoiding false positives. */
Deno.test("index: the /users/fetch-me exclusion check is not vacuous", () => {
  assert(/["'`]\/users\/fetch-me["'`]/.test('const p = "/users/fetch-me";'));
  assert(!/["'`]\/users\/fetch-me["'`]/.test('"...names /users/fetch-me in prose..."'));
});

Deno.test("index: the credential field is declared secret, the org-id field is not", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  const apiKeyField = method.fields?.find((f) => f.key === "apiKey");
  const orgIdField = method.fields?.find((f) => f.key === "orgId");
  assertEquals(apiKeyField?.type, "secret");
  assertEquals(orgIdField?.type, "string");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health ------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence
 * pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the API key. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest ------------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.phantombuster");
  assert(manifest.w6w.network.allow.includes("api.phantombuster.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.phantombuster.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, downloaded verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from phantombuster.com/assets33397015291/icons/favicon.svg
  // on 2026-09-01: 1937 bytes, image/svg+xml, matching the scouted facts exactly.
  assert(svg.includes('viewBox="0 0 24 24"'), "icon.svg no longer carries the vendor's viewBox");
  for (const colour of ["#3A3837", "#fff"]) {
    assert(svg.includes(colour), `vendor colour ${colour} missing — the mark was redrawn`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
