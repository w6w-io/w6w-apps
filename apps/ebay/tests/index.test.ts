import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 4);
  assertEquals(app.auth?.length, 1);
  assertEquals(app.healthChecks?.length, 2);
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

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — this
 * app's own doc comments talk at length about credentials, bearer tokens
 * and Authorization headers.
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
    assert(!/\bauthorization\b/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/client[_-]?secret/i.test(src), `${a.key}: touches the client secret`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The API origin lives in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.ebay\.com/.test(src), `${a.key}: contains an eBay host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned =
    /^(host|origin|domain|base_?url|api_?key|api_?token|token|client_?id|client_?secret)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the request surface, derived rather than hand-listed --------------------

/** Every path an action requests, derived from its own source (backtick or plain-quoted). */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/[`"](\/buy\/browse\/v1\/[^`"]*)[`"]/g)) {
    out.push(m[1].replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

const DOCUMENTED_ENDPOINTS = [
  "/buy/browse/v1/item_summary/search",
  "/buy/browse/v1/item/{}",
  "/buy/browse/v1/item/get_item_by_legacy_id",
  "/buy/browse/v1/item/get_items_by_item_group",
];

Deno.test("index: the actions call exactly the 4 documented Browse API endpoints", async () => {
  const called: string[] = [];
  for (const a of app.actions) {
    const paths = requestPaths(await actionSource(a.key));
    assertEquals(
      paths.length,
      1,
      `${a.key}: expected exactly one request path, got ${paths.length}`,
    );
    called.push(paths[0]);
  }
  assertEquals(new Set(called).size, called.length, "two actions build the same request");
  assertEquals(called.slice().sort(), DOCUMENTED_ENDPOINTS.slice().sort());
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the credential fields are declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "client-credentials");
  assertEquals(method.type, "custom");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(typeof method.exchange, "function");
  assertEquals(typeof method.refresh, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

Deno.test("index: the quota check is signed and connection-scoped", () => {
  const quota = (app.healthChecks ?? []).find((h) => h.key === "quota");
  assert(quota, "no quota check");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(typeof quota.check, "function");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only api.ebay.com", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.ebay");
  assertEquals(manifest.w6w.network.allow, ["api.ebay.com"]);
  assert(!manifest.w6w.network.allow.includes("developer.ebay.com"));
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from cdn.simpleicons.org/ebay: 1,283 bytes, eBay red (#E53238).
  assert(svg.includes('fill="#E53238"'), "icon fill color changed");
  assert(svg.includes("<title>eBay</title>"), "icon lost its vendor title");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// bearer\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
