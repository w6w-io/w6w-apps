import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 16;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
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

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: create-review is the one action that opts out of auth", () => {
  const requiresAuthFalse = app.actions.filter((a) => a.requiresAuth === false);
  assertEquals(requiresAuthFalse.map((a) => a.key), ["create-review"]);
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
 * Strip comments so the sandbox guards below scan CODE, not prose — this app's
 * doc comments discuss "credential", "authorization" and "api key" at length.
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
    assert(!/x-api-token/i.test(src), `${a.key}: sets the auth header itself`);
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
    assert(!/judge\.me/.test(src), `${a.key}: contains a Judge.me host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * `shopDomain`/`apiKey`/`apiToken` select WHICH connection signs a request and
 * must come from the Connection, never from a param — except `create-review`,
 * which is documented `security: []` (no authentication at all) and so has no
 * Connection to draw a shop domain from in the first place; the vendor's own
 * public review-submission form works the identical way. Plain `domain` is
 * excluded from the ban entirely: `update-shop`'s `domain` is the vendor's own
 * writable shop-profile field (`PUT /shops` body's `domain`), a business
 * value, not a connection selector.
 */
Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|shop_?domain|api_?key|api_?token|token)$/i;
  for (const a of app.actions) {
    if (a.key === "create-review") continue;
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth ?? [];
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  const secretFields = (method.fields ?? []).filter((f) => f.key === "apiKey");
  assertEquals(secretFields.length, 1);
  assertEquals(secretFields[0].type, "secret");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: no OAuth2 auth method is declared — the doc names no token endpoint", () => {
  assertEquals((app.auth ?? []).map((m) => m.type), ["apiKey"]);
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

Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = (app.healthChecks ?? []).filter((h) => h.network?.allow?.length);
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
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { url: string; alt: string } };
      categories: string[];
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.judgeme");
  assert(manifest.w6w.network.allow.includes("api.judge.me"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.judge.me"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.jpg");
  assert(manifest.w6w.appearance.icon.alt.length > 0);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

Deno.test("index: the icon is the vendor's real, verified asset", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.jpg", import.meta.url));
  assertEquals(bytes.byteLength, 10529);
  // JFIF/JPEG magic bytes — proves this is a real image file, not an HTML error page.
  assertEquals(bytes[0], 0xff);
  assertEquals(bytes[1], 0xd8);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
