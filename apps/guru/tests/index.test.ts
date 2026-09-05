import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 16;

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
 * Create calls (Card, Collection, Folder) mint a new resource each time and
 * accept no idempotency key Guru documents — a retried create would produce a
 * duplicate, not a no-op.
 */
Deno.test("index: no create action is marked idempotent", () => {
  for (const key of ["card-create", "collection-create", "folder-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: a PUT-shaped replace, a delete, and a verify are all safe to
 * retry — replaying any of them lands on the same end state.
 */
Deno.test("index: the replace/delete/verify performs are marked idempotent", () => {
  for (
    const key of [
      "card-update",
      "card-update-content",
      "card-delete",
      "card-verify",
      "folder-update",
    ]
  ) {
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
 * otherwise trip its own assertion.
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
    assert(!/\bbasicHeader\b/.test(src), `${a.key}: builds a Basic auth header itself`);
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
    assert(!/getguru\.com/.test(src), `${a.key}: contains a Guru host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * `token` itself is excluded from the banned set: it is Guru's own documented
 * pagination-cursor query parameter name (`?token=` on every list/search
 * endpoint — see `lib/client.ts`), an opaque paging cursor rather than
 * credential material, and it is legitimately exposed as `pageTokenParam`.
 */
Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|username|password)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the redaction invariant, derived rather than listed ---------------------

/**
 * Every action that actually parses a Guru response body can carry an
 * embedded `CollectionModel` (on a Card or a Folder) or be a `TeamUser`
 * itself — both of which may embed a live Collection token (see
 * `lib/client.ts`). Only `card-delete` and `card-verify` never read a body at
 * all (Guru answers both with no content), so they are the sole exemption.
 */
const NO_BODY_ACTIONS = new Set(["card-delete", "card-verify"]);

Deno.test("index: exactly the body-reading actions strip tokens", async () => {
  const bodyReading: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (!NO_BODY_ACTIONS.has(a.key)) bodyReading.push(a.key);
    // A list action passes the function itself to `.map(stripTokens)` rather
    // than invoking it directly, so this deliberately checks for the name
    // appearing at all, not for a `stripTokens(` call specifically.
    if (/\bstripTokens\b/.test(src)) stripping.push(a.key);
  }
  assertEquals(
    bodyReading.slice().sort(),
    stripping.slice().sort(),
    `body-reading actions: ${bodyReading.sort().join(", ")} · stripping: ${
      stripping.sort().join(", ")
    }`,
  );
  assertEquals(bodyReading.length, ACTION_COUNT - NO_BODY_ACTIONS.size);
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path. The authentication doc's own worked
 * example points at `/api/v1/teams`, which is absent from the current
 * OpenAPI document — see `auth/basic.ts` for the measurement. If someone
 * "fixes" the probe back to match the doc, this fails on purpose.
 */
Deno.test("index: the auth probe is /whoami, not the stale doc example /teams", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/basic.ts", import.meta.url)));
  assert(src.includes("/whoami"), "auth probe no longer hits /whoami");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/teams["'`]/.test(src),
    "the probe was pointed at the stale /teams example",
  );
});

Deno.test("index: the credential fields are declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "basic");
  assertEquals(method.type, "basic");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
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

Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

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
  assertEquals(manifest.w6w.id, "io.w6w.guru");
  assert(manifest.w6w.network.allow.includes("api.getguru.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.getguru.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's own mark, downloaded verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from Guru's own marketing site
  // (cdn.prod.website-files.com/.../Guru%20logo.svg, alt="Guru Logo") on
  // 2026-09-05: a single 162.31x162.01 viewBox with the "G" mark.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 162.31 162.01">'),
    "icon.svg is not the vendor's original viewBox",
  );
  assert(
    svg.includes('class="cls-1"'),
    "the vendor's own class name changed — the mark was re-exported",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
