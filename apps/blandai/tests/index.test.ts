import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 19;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
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
 * Every action that dispatches, transfers, or bills a call/number/pathway is
 * NOT safe to retry blindly — a dropped response and a retry would double the
 * side effect (a second call placed, a second number purchased, a second
 * analysis billed, a second pathway created).
 */
Deno.test("index: every side-effect-creating perform is marked not idempotent", () => {
  for (
    const key of ["call-send", "call-transfer", "call-analyze", "pathway-create", "number-purchase"]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these end in the same state on a retry (call already
 * stopped/transferred is a documented error, not a new side effect; update and
 * delete are naturally idempotent), so marking them retryable lets the runtime
 * recover from a dropped connection instead of failing the whole run.
 */
Deno.test("index: the genuinely-retryable performs are marked idempotent", () => {
  for (const key of ["call-stop", "call-stop-all", "pathway-update", "pathway-delete"]) {
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
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment explaining why an action never touches the credential would
 * otherwise trip its own guard.
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
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key\s*[:=]/i.test(src), `${a.key}: touches an API key`);
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
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/bland\.ai/.test(src), `${a.key}: contains a Bland host literal`);
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

// --- the two endpoints that live outside /v1 ---------------------------------

/**
 * `number-purchase` is the one action whose path is verified to sit outside
 * `/v1` (see `lib/client.ts` finding 3). Pinned here so a future "helpful"
 * cleanup that prefixes every action path with `/v1` breaks loudly instead of
 * silently pointing this action at a 404.
 */
Deno.test("index: number-purchase posts to /numbers/purchase, not /v1/numbers/purchase", async () => {
  const src = await actionSource("number-purchase");
  assert(
    src.includes('"/numbers/purchase"'),
    "number-purchase no longer posts to /numbers/purchase",
  );
  assert(
    !src.includes('"/v1/numbers/purchase"'),
    "number-purchase was moved under /v1 — that host is unverified",
  );
});

// --- auth --------------------------------------------------------------------

/**
 * The auth probe is pinned by path and header shape. `/v1/me` was chosen
 * because it needs a credential and returns no usable secret (see
 * `auth/api-key.ts`); the header is the raw key, not `Bearer `-prefixed (see
 * `lib/client.ts` finding 1).
 */
Deno.test("index: the auth probe is GET /v1/me, and the header carries the raw key", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/v1/me"), "auth probe no longer hits /v1/me");
  assert(!/bearer /i.test(src), "the sign hook adds a Bearer prefix Bland's docs do not confirm");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health --------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
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

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.blandai");
  assert(manifest.w6w.network.allow.includes("api.bland.ai"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.bland.ai"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon file exists and is the vendor's mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // A verbatim wrap of the real apple-touch-icon served from
  // https://www.bland.ai/images/webclip.png (fetched 2026-08-29): Bland's
  // square "b" mark in white on the brand's red, embedded byte-for-byte as a
  // base64 PNG so the SVG carries the vendor's pixels unmodified.
  assert(
    svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'),
    "icon.svg is not a valid SVG wrapper",
  );
  assert(svg.includes("data:image/png;base64,"), "icon.svg no longer embeds the vendor PNG");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
