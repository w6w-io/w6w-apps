import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 4);
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

/** Creates always start a new, distinct record — a retry must not be assumed safe. */
Deno.test("index: every *-create action is marked non-idempotent", () => {
  for (const a of app.actions.filter((a) => a.key.endsWith("-create"))) {
    assertEquals(a.idempotent, false, a.key);
  }
});

/** Updates by id are full-or-partial overwrites — re-applying the same body is safe. */
Deno.test("index: every *-update action is marked idempotent", () => {
  for (const a of app.actions.filter((a) => a.key.endsWith("-update"))) {
    assertEquals(a.idempotent, true, a.key);
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
 * Per Clio's own Fields guide, omitting `fields` returns almost nothing on
 * most endpoints (`id`/`etag` only). Every action that declares a `fields`
 * param must prefill a non-trivial default rather than leaving the vendor's
 * own near-empty one in place — derived from every action's own params
 * rather than hand-listed, so a new action that forgets this is caught here.
 */
Deno.test("index: every fields param carries a non-trivial default", () => {
  const withFields = app.actions.filter((a) => (a.params ?? []).some((p) => p.key === "fields"));
  assert(withFields.length > 0, "no action declares a fields param — this test would be vacuous");
  for (const a of withFields) {
    const p = a.params!.find((p) => p.key === "fields")!;
    assert(typeof p.default === "string", `${a.key}: fields has no default`);
    const fields = (p.default as string).split(",").map((f) => f.trim());
    assert(fields.length > 1, `${a.key}: fields default is not a non-trivial list: ${p.default}`);
  }
});

// --- sandbox guards, derived from every action's own source -----------------

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/\baccessToken\b/.test(src), `${a.key}: touches an access token`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
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
 * The four regional hosts live in `lib/client.ts` and nowhere else. An action
 * that hard-coded a host could be pointed somewhere the manifest never
 * allowlisted, or ignore the Connection's own region.
 */
Deno.test("index: no action hard-codes a Clio host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/clio\.com/.test(src), `${a.key}: contains a Clio host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|region|access_?token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: four regional oauth2 auth methods, each with a unique key", () => {
  const keys = app.auth.map((a) => a.key);
  assertEquals(new Set(keys).size, 4);
  assert(keys.includes("oauth2"));
  assert(keys.includes("oauth2-eu"));
  assert(keys.includes("oauth2-ca"));
  assert(keys.includes("oauth2-au"));
  for (const a of app.auth) {
    assertEquals(a.type, "oauth2", a.key);
    assertEquals(typeof a.test, "function", a.key);
    assertEquals(typeof a.sign, "function", a.key);
  }
});

/** No app in this pack has ever needed a scope on an oauth2 method here — see auth/oauth2.ts. */
Deno.test("index: no auth method declares OAuth scopes Clio's own authorize URL ignores", () => {
  for (const a of app.auth) {
    assertEquals(a.oauth2?.scopes, [], a.key);
  }
});

Deno.test("index: every auth method's authorizationUrl and tokenUrl share the same host", () => {
  for (const a of app.auth) {
    const authHost = new URL(a.oauth2!.authorizationUrl).host;
    const tokenHost = new URL(a.oauth2!.tokenUrl).host;
    assertEquals(authHost, tokenHost, a.key);
  }
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

/** A check that widens egress must be unsigned — a status host never sees the access token. */
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

Deno.test("index: the manifest allows all four regional API hosts and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.clio");
  for (const host of ["app.clio.com", "eu.app.clio.com", "ca.app.clio.com", "au.app.clio.com"]) {
    assert(manifest.w6w.network.allow.includes(host), `missing ${host}`);
  }
  assert(!manifest.w6w.network.allow.includes("status.clio.com"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is Clio's own mark, downloaded verbatim", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Downloaded verbatim from docs.developers.clio.com/img/favicon.png on
  // 2026-08-24: 1,895 bytes, 64x64 PNG, md5 92de47b9702a9c7cfc3b9e2289cf1119.
  assertEquals(bytes.length, 1895);
  // PNG signature + IHDR width/height (64x64), so a re-encode or resize fails this.
  assertEquals([...bytes.slice(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const width = new DataView(bytes.buffer, bytes.byteOffset + 16, 4).getUint32(0);
  const height = new DataView(bytes.buffer, bytes.byteOffset + 20, 4).getUint32(0);
  assertEquals(width, 64);
  assertEquals(height, 64);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
