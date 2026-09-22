import { assert, assertEquals, assertNotEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 23;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

/**
 * The exact surface, pinned by name. The contract for this app is 23 confirmed
 * Team API actions — a later edit that adds, drops or renames one should fail
 * here rather than quietly change what "Brex" covers.
 */
Deno.test("index: the 23 action keys are exactly the confirmed Team API surface", () => {
  const expected = [
    "user-list",
    "user-invite",
    "user-get-current",
    "user-get",
    "user-update",
    "location-list",
    "location-create",
    "location-get",
    "department-list",
    "department-create",
    "department-get",
    "title-list",
    "title-create",
    "title-get",
    "card-list",
    "card-get",
    "card-update",
    "card-lock",
    "card-unlock",
    "card-terminate",
    "legal-entity-list",
    "legal-entity-get",
    "company-get",
  ];
  assertEquals(app.actions.map((a) => a.key).sort(), expected.sort());
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description and its output", () => {
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

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * The four creates. Brex documents an optional `Idempotency-Key` on each, and
 * this app forwards one when the caller supplies it — but it never invents one,
 * so a retry with no key creates a second resource. Marking any of these
 * `idempotent: true` would let the runtime retry a create on the app's own
 * initiative and duplicate it.
 */
Deno.test("index: the four creates are not marked idempotent", () => {
  for (const key of ["user-invite", "location-create", "department-create", "title-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and not just caution: these six set a state rather than
 * producing a resource, so a retry after a dropped connection converges instead
 * of doubling anything.
 */
Deno.test("index: the state-setting writes are marked idempotent", () => {
  for (
    const key of [
      "user-update",
      "card-update",
      "card-lock",
      "card-unlock",
      "card-terminate",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
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
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
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
    assert(!/brex\.com/.test(src), `${a.key}: contains a Brex host literal`);
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

// --- auth ------------------------------------------------------------------

Deno.test("index: the single auth method is a Bearer token, not an OAuth2 flow", () => {
  const [method] = app.auth;
  assertEquals(method.type, "bearer");
  assertEquals(method.oauth2, undefined);
  assertEquals(typeof method.sign, "function");
  assertEquals(typeof method.test, "function");
  const [field] = method.fields ?? [];
  assertEquals(field.key, "apiToken");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

/**
 * The partner OAuth2 flow Brex documents is deliberately not built, and the way
 * it would creep back in is as a stray config key or an authorization URL. This
 * pins its absence.
 */
Deno.test("index: no OAuth2 configuration ships, and the app is not tenant-authed", () => {
  for (const m of app.auth) {
    assert(m.oauth2 === undefined, `${m.key}: declares an OAuth2 config`);
    assert(m.tenantAuth === undefined, `${m.key}: declares tenant auth`);
    assert(m.jit === undefined, `${m.key}: declares jit auth`);
  }
});

// --- health ----------------------------------------------------------------

Deno.test("index: every health check declares exactly one of check/unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
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

interface Manifest {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { url?: string; svg?: string; alt?: string } };
  };
  name: string;
  version: string;
}

async function manifest(): Promise<Manifest> {
  return JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as Manifest;
}

Deno.test("index: the manifest declares the vendor identity and one egress host", async () => {
  const m = await manifest();
  assertEquals(m.name, "@w6w-apps/brex");
  assertEquals(m.w6w.id, "io.w6w.brex");
  assertEquals(m.w6w.displayName, "Brex");
  assert(m.w6w.categories.length >= 1 && m.w6w.categories.length <= 3);
  assertEquals(m.w6w.categories[0], "finance");
  // The API host, and only it.
  assertEquals(m.w6w.network.allow, ["api.brex.com"]);
});

/**
 * The status host belongs to the health check's own per-hook allowlist, never to
 * the app's. `status.brex.com` must not appear in the manifest, and the staging
 * API host Brex documents ("not a sandbox, will not work with customer tokens")
 * must appear nowhere at all.
 */
Deno.test("index: the status host and the staging host are not app-level egress", async () => {
  const m = await manifest();
  assert(!m.w6w.network.allow.includes("status.brex.com"));
  assert(!m.w6w.network.allow.some((h) => h.includes("staging")));
  const index = await Deno.readTextFile(new URL("../index.ts", import.meta.url));
  assert(!index.includes("api-staging"));
});

/** The icon is the vendor's PNG mark, saved verbatim, declared through `url`. */
Deno.test("index: the icon is the vendor's PNG, declared via url", async () => {
  const m = await manifest();
  assertEquals(m.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(m.w6w.appearance.icon.alt, "Brex");
  // An SVG slot is not declared, because brex.com has no SVG favicon to declare.
  assertEquals(m.w6w.appearance.icon.svg, undefined);
});

Deno.test("index: assets/icon.png is a real 256x256 PNG, not a placeholder", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  assertEquals(
    signature.every((b, i) => bytes[i] === b),
    true,
    "assets/icon.png is not a PNG",
  );
  // IHDR: width and height are big-endian u32 at offsets 16 and 20.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assertEquals(view.getUint32(16), 256);
  assertEquals(view.getUint32(20), 256);
  assert(bytes.length > 10_000, `icon.png is only ${bytes.length} bytes — not the vendor mark`);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  // And the guard is not vacuous: a real violation is still caught.
  assertNotEquals(code("await fetch(url)").trim(), "");
});
