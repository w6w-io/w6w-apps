import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 18;

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
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assert(performs.length > 0, "no perform actions — this test would pass vacuously");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * ServiceM8's create/update endpoints accept no client-supplied idempotency
 * key anywhere in the reference, so every action that CREATES a new record is
 * `idempotent: false`: a runtime retry of a marked-idempotent create would
 * turn one dropped connection into two Jobs, two Clients or two Notes.
 */
Deno.test("index: no record-creating action is marked idempotent", () => {
  for (
    const key of [
      "job-create",
      "company-create",
      "jobactivity-create",
      "jobmaterial-create",
      "note-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these set fields on an existing record (`job-update`,
 * `company-update`) or archive one (`job-delete`, which sets `active=0` and is
 * a no-op on an already-archived record) — genuinely safe to retry.
 */
Deno.test("index: update and archive actions are marked idempotent", () => {
  for (const key of ["job-update", "company-update", "job-delete"]) {
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

Deno.test("index: no action declares the same param key twice", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc
 * comment mentioning "credential" or an absolute host would otherwise trip
 * the same assertion meant to catch the real thing.
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
    assert(!/x-api-key/i.test(src), `${a.key}: sets the auth header itself`);
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
    assert(!/servicem8\.com/.test(src), `${a.key}: contains a ServiceM8 host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|secret)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/** Every request path an action builds, `${…}` interpolations collapsed to `{}`. */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("job-get");
  assert(
    requestPaths(src).includes("/job/{}.json"),
    "requestPaths no longer recognises a template-literal path — the derivation below is blind",
  );
  assertEquals(requestPaths('const p = "/company.json";'), ["/company.json"]);
});

Deno.test("index: every action's paths are relative, and every action builds at least one", async () => {
  for (const a of app.actions) {
    const paths = requestPaths(await actionSource(a.key));
    assert(paths.length > 0, `${a.key}: no request path found — is it calling the API at all?`);
    for (const p of paths) assert(p.startsWith("/"), `${a.key}: non-relative path ${p}`);
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the api-key credential field is declared secret", () => {
  const method = app.auth.find((m) => m.key === "api-key")!;
  assertEquals(method.type, "apiKey");
  assert((method.fields ?? []).length > 0, "no fields — this test would pass vacuously");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});

Deno.test("index: the auth method has both test and sign", () => {
  for (const m of app.auth) {
    assertEquals(typeof m.test, "function", `${m.key}: no test hook`);
    assertEquals(typeof m.sign, "function", `${m.key}: no sign hook`);
  }
});

/**
 * The header the reference actually documents (`X-Api-Key`), pinned so a
 * regression to `Authorization: Bearer` — this API's OAuth prefix, not its API
 * key prefix — fails loudly instead of producing a 401 that reads exactly like
 * a revoked key.
 */
Deno.test("index: the api-key method signs with X-Api-Key, not Authorization", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(/"x-api-key"/.test(src), "the api-key method no longer signs with x-api-key");
  assert(
    !/headers\["authorization"\]/.test(src),
    "the api-key method sets an Authorization header",
  );
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

Deno.test("index: no health check is signed", () => {
  for (const h of app.healthChecks) {
    assert(h.credential !== "signed", `${h.key}: probes with the user's credential`);
  }
});

// --- manifest --------------------------------------------------------------

async function manifest() {
  return JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { url?: string; svg?: string } };
    };
  };
}

Deno.test("index: the manifest allows only the API host", async () => {
  const m = await manifest();
  assertEquals(m.w6w.id, "io.w6w.servicem8");
  assertEquals(m.w6w.network.allow, ["api.servicem8.com"]);
  assert(!m.w6w.network.allow.includes("127.0.0.1"));
});

Deno.test("index: the manifest declares 1-3 categories", async () => {
  const { w6w } = await manifest();
  assert(w6w.categories.length >= 1 && w6w.categories.length <= 3);
  assertEquals(w6w.categories, ["crm", "calendar", "finance"]);
});

/**
 * The icon is a raster PNG, not an SVG: ServiceM8 publishes no vector mark
 * this app could find (see README), so `assets/icon.png` — the site's own
 * 256x256 apple-touch-icon, downloaded verbatim 2026-08-24 — is used via the
 * `url` slot instead of `svg`.
 */
Deno.test("index: the icon is a PNG via the url slot, not svg", async () => {
  const { w6w } = await manifest();
  assertEquals(w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(w6w.appearance.icon.svg, undefined);

  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // PNG magic number.
  assertEquals([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
