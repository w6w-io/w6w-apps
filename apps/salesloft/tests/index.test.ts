import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 26;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth?.length, 2);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, a resource and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Creates and deletes have no natural upsert key on Salesloft's side, so a
 * retried request would create/delete twice; updates and enroll/remove are
 * genuinely safe to repeat (an update converges on the same state, deleting
 * an already-deleted membership just 404s harmlessly on the vendor's own
 * "can be called multiple times successfully" contract).
 */
Deno.test("index: nothing that creates a new record is marked idempotent", () => {
  for (
    const key of [
      "person-create",
      "account-create",
      "cadence-membership-create",
      "call-create",
      "note-create",
      "task-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: updates and deletes are marked idempotent", () => {
  for (
    const key of [
      "person-update",
      "person-delete",
      "account-update",
      "account-delete",
      "cadence-membership-delete",
      "task-update",
      "task-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

Deno.test("index: the two idempotency lists partition every perform action", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  const retryable = performs.filter((a) => a.idempotent).length;
  const notRetryable = performs.filter((a) => !a.idempotent).length;
  assertEquals(retryable + notRetryable, performs.length);
  assertEquals(retryable, 7);
  assertEquals(notRetryable, 6);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the sandbox guards below scan CODE, not prose. */
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
 * The API origin lives in `lib/client.ts` and nowhere else — an action that
 * hard-coded a host could be pointed somewhere the manifest never
 * allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/salesloft\.com/i.test(src), `${a.key}: contains a Salesloft host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: builds an absolute URL`);
  }
});

/**
 * `domain` is deliberately NOT in this list — Salesloft has no per-tenant
 * subdomain to leak; `domain` is a genuine Account business field (a
 * company's own website domain), not connection identity.
 */
Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|base_?url|api_?key|api_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: both auth methods sign the same way and declare a secret credential field", () => {
  for (const method of app.auth ?? []) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
  }
  const apiKey = app.auth?.find((m) => m.key === "api-key");
  assertEquals(apiKey?.type, "apiKey");
  for (const f of apiKey?.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  const oauth2 = app.auth?.find((m) => m.key === "oauth2");
  assertEquals(oauth2?.type, "oauth2");
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

Deno.test("index: the quota check is informational", () => {
  const quota = app.healthChecks?.find((h) => h.key === "quota");
  assertEquals(quota?.severity, "informational");
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = (app.healthChecks ?? []).filter((h) => h.network?.allow?.length);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context" || h.credential === undefined,
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only the API host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt?: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.salesloft");
  assertEquals(manifest.w6w.network.allow, ["api.salesloft.com"]);
  assert(!manifest.w6w.network.allow.includes("status.salesloft.com"));
  assert(!manifest.w6w.network.allow.includes("accounts.salesloft.com"));
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(typeof manifest.w6w.appearance.icon.alt === "string");
});

Deno.test("index: the icon is a real image reference, not a placeholder", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"), "icon.svg is not an SVG document");
  assert(svg.includes("data:image/png;base64,"), "icon is not the embedded raster mark");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
});
