import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 33;

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
 * Add Subscriber, Create Custom Field, Move Subscriber, Create Broadcast and
 * Record Purchase have no dedupe key documented anywhere in AWeber's API —
 * retrying any of them creates a second thing (or, for the two whose target
 * no longer matches after the first call succeeds, fails outright). Marking
 * any of these `true` would let the runtime silently double-create.
 */
Deno.test("index: nothing that creates or moves a resource without a dedupe key is idempotent", () => {
  for (
    const key of [
      "subscriber-add",
      "subscriber-move",
      "custom-field-create",
      "broadcast-create",
      "purchase-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: every PUT/PATCH/DELETE action here is a full overwrite or a
 * removal, so repeating it leaves the same end state — these are genuinely
 * safe to retry.
 */
Deno.test("index: every overwrite/delete action is marked idempotent", () => {
  for (
    const key of [
      "subscriber-update",
      "subscriber-update-by-email",
      "subscriber-delete",
      "subscriber-delete-by-email",
      "custom-field-update",
      "custom-field-delete",
      "broadcast-update",
      "broadcast-delete",
      "broadcast-cancel",
      "broadcast-schedule",
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
    assert(!/access[_-]?token/i.test(src), `${a.key}: touches an access token`);
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
 * The API origin lives in `lib/client.ts` and nowhere else, except
 * `subscriber-move`, which must build a full `list_link` self_link URL for
 * the destination list — that one is allowed to reference `API_BASE` /
 * `API_PREFIX` (imported constants, not a literal), but never a bare host
 * literal or a hard-coded absolute URL string.
 */
Deno.test("index: no action hard-codes the AWeber host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.aweber\.com/.test(src), `${a.key}: contains an AWeber host literal`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|access_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /accounts", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/oauth2.ts", import.meta.url)));
  assert(src.includes('"/accounts"'), "auth probe no longer hits /accounts");
});

Deno.test("index: oauth2 is the only auth method, with test and sign wired up", () => {
  assertEquals(app.auth.length, 1);
  const [method] = app.auth;
  assertEquals(method.key, "oauth2");
  assertEquals(method.type, "oauth2");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: the OAuth host is not restated in the manifest's network.allow", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.aweber");
  assert(manifest.w6w.network.allow.includes("api.aweber.com"));
  // auth.aweber.com is allowed implicitly by the runtime for the declared
  // oauth2 authorizationUrl/tokenUrl hosts — restating it here would be
  // redundant, and no action ever calls it directly.
  assert(!manifest.w6w.network.allow.includes("auth.aweber.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
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

// --- icon ------------------------------------------------------------------

Deno.test("index: the icon is the vendor's real mark, fetched verbatim from their own CDN", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from assets.aweber-static.com's own mask-icon asset
  // (referenced by <link rel="mask-icon"> on www.aweber.com) on 2026-09-05.
  assert(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), "not an svg");
  // The vendor's own geometry — the thing a redraw would change.
  assert(svg.includes("M9.1,0c-0.4,0-0.7,0.2-1,0.5"), "the vendor's geometry changed");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
