import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { REGIONS } from "../lib/regions.ts";

const ACTION_COUNT = 22;

Deno.test("index: exports actions, one auth method per region, and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, REGIONS.length);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every auth method key is unique and alphanumeric", () => {
  const keys = app.auth.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate auth key");
  for (const key of keys) {
    assert(/^[A-Za-z0-9_-]+$/.test(key), `not a valid auth key: ${key}`);
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
 * Creating a record or sending an email starts a new resource/side-effect on
 * every call — retrying a dropped response would create a duplicate or send
 * a second email, not converge on the same state.
 */
Deno.test("index: creates and the email action are not marked idempotent", () => {
  for (
    const key of [
      "contact-create",
      "item-create",
      "invoice-create",
      "invoice-email",
      "estimate-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: updates, deletes and the status transitions converge on the
 * same end state no matter how many times they run, so the runtime is free
 * to retry them.
 */
Deno.test("index: updates, deletes and status transitions are marked idempotent", () => {
  for (
    const key of [
      "contact-update",
      "contact-delete",
      "item-update",
      "item-delete",
      "invoice-update",
      "invoice-delete",
      "invoice-mark-sent",
      "invoice-void",
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
 * Strip comments so the sandbox guards below scan CODE, not prose.
 *
 * Without this the checks are simultaneously too weak and too strong: a doc
 * comment explaining *why* an action never touches the credential trips the
 * assertion, while a reviewer's natural fix — deleting the explanation —
 * would leave a real violation just as invisible.
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
    assert(!/\bzoho-oauthtoken\b/i.test(src), `${a.key}: builds the oauth header itself`);
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
 * Every API host lives in `lib/regions.ts` / `lib/client.ts` and nowhere
 * else. An action that hard-coded a `www.zohoapis.<tld>` host — or accepted
 * one as a param — could be pointed somewhere the manifest never allowlisted.
 */
function stripDocProse(src: string): string {
  return src.replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
}

Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = stripDocProse(await actionSource(a.key));
    assert(
      !/zoho\.com|zoho\.eu|zoho\.in|zohocloud|zohoapis/.test(src),
      `${a.key}: contains a Zoho host literal`,
    );
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: stripDocProse actually strips, so the guard above means something", () => {
  const src = 'hint: "See https://example.com/docs.",\nconst host = "https://www.zohoapis.com";';
  const stripped = stripDocProse(src);
  assert(!stripped.includes("example.com"), "doc-prose URL survived stripping");
  assert(stripped.includes("www.zohoapis.com"), "a real code literal was stripped too");
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|access_?token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: one oauth2 auth method per Zoho data centre, each with test and sign", () => {
  for (const region of REGIONS) {
    const method = app.auth.find((a) => a.key === `oauth2-${region.key}`);
    assert(method, `missing auth method for region ${region.key}`);
    assertEquals(method!.type, "oauth2");
    assertEquals(typeof method!.test, "function");
    assertEquals(typeof method!.sign, "function");
  }
});

Deno.test("index: the manifest allows every region's API host and none of the accounts hosts", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.zoho-invoice");
  for (const region of REGIONS) {
    assert(manifest.w6w.network.allow.includes(region.apiHost), `missing ${region.apiHost}`);
    // OAuth hosts are allowed implicitly (derived from the auth methods'
    // authorizationUrl/tokenUrl) and must not be restated here.
    assert(
      !manifest.w6w.network.allow.includes(region.accountsHost),
      `should not list ${region.accountsHost}`,
    );
  }
  assertEquals(manifest.w6w.network.allow.length, REGIONS.length);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
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
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks
 * `ok` in the roll-up, so at any severity but `informational` a declared
 * absence pins the App at `unknown` forever.
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
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length || h.feed);
  assert(widening.length > 0, "no check widens egress — this test would pass vacuously");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context" || h.credential === undefined,
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("index: the icon is the placed vendor mark, a non-trivial PNG", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // PNG signature.
  assertEquals(Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert(bytes.length > 500, "icon.png looks too small to be a real mark");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
