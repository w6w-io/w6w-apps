import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 11;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 2);
  assertEquals(app.healthChecks?.length, 1);
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
 * Every documented side-effecting call in this app either mints a new record
 * with no dedup key (create), or re-triggers a customer-visible effect on
 * retry (sending an email, registering a second payment) — so nothing here
 * is safe to mark idempotent. `contact-update` is the one exception: a PATCH
 * with the same fields twice leaves the same end state.
 */
Deno.test("index: only contact-update is marked idempotent among perform actions", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(a.idempotent, a.key === "contact-update", `${a.key}`);
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
 * otherwise trip the assertion itself.
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
    assert(!/api[_-]?token/i.test(src), `${a.key}: touches an API token`);
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
 * The API host lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host, or an absolute URL, could be pointed somewhere the
 * manifest never allowlisted.
 */
Deno.test("index: no action hard-codes the host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/moneybird\.com/.test(src), `${a.key}: contains a Moneybird host literal`);
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

// --- auth --------------------------------------------------------------

Deno.test("index: both auth methods declare secret credential fields and a test hook", () => {
  assertEquals(app.auth?.map((m) => m.key).sort(), ["oauth2", "personal-token"]);
  for (const method of app.auth ?? []) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
    for (const f of method.fields ?? []) {
      assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not secret`);
    }
  }
});

/**
 * Both auth methods probe the same endpoint: `GET /administrations.json`.
 * Choosing it is the step where a credential most easily leaks back out — a
 * `/me`-style whoami is the obvious alternative and several vendors in this
 * pack (Apify, Follow Up Boss, Mailjet) have been caught echoing a live
 * secret back through exactly that endpoint. If someone swaps the probe,
 * this makes them do it deliberately.
 */
Deno.test("index: both auth methods probe /administrations.json", async () => {
  for (const key of ["personal-token", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${key}.ts`, import.meta.url)));
    assert(
      src.includes("fetchAdministrations"),
      `${key}: no longer probes via fetchAdministrations`,
    );
  }
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

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = (app.healthChecks ?? []).filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows exactly the Moneybird API host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.moneybird");
  assertEquals(manifest.w6w.network.allow, ["moneybird.com"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon file exists and is the vendor's own SVG mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from developer.moneybird.com/assets/moneybird.svg on
  // 2026-09-06: 6,715 bytes.
  assertEquals(svg.length, 6715);
  assert(svg.trimStart().startsWith("<svg"), "icon.svg does not start with an <svg> tag");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-token\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
