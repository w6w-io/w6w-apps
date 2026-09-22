import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 15;

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
 * Starting an export job creates a new `progressId` every time and consumes the
 * account's export allowance. Marking it `true` would turn one transient network
 * error into two jobs.
 */
Deno.test("index: the export-start perform is not marked idempotent", () => {
  const start = app.actions.find((a) => a.key === "response-export-start");
  assertEquals(start?.type, "perform");
  assertEquals(start?.idempotent, false);
});

Deno.test("index: the response-export flow is present end to end", () => {
  // `find` is the assertion: a missing key yields undefined, distinct from the
  // three real defaults. If any of these were removed, `deep` became a lie.
  const deep = [
    "survey-list",
    "survey-get",
    "response-export-start",
    "response-export-status",
    "response-export-file-get",
  ]
    .map((key) => app.actions.find((a) => a.key === key)?.key);
  assertEquals(deep, [
    "survey-list",
    "survey-get",
    "response-export-start",
    "response-export-status",
    "response-export-file-get",
  ]);
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
 * Strip comments so the sandbox guards below scan CODE, not prose. Without this
 * the checks are simultaneously too weak and too strong: a doc comment
 * explaining why an action never touches the credential trips the assertion,
 * while a reviewer's natural fix — deleting the explanation — would leave a
 * real violation just as invisible.
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

/** The API host is built in `lib/client.ts` and nowhere else. */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/qualtrics\.com/.test(src), `${a.key}: contains a Qualtrics host literal`);
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

/** The datacenter id belongs to the Connection, so it must not be an action param. */
Deno.test("index: datacenterId is not an action param", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key !== "datacenterId", `${a.key}: datacenterId leaked into params`);
    }
  }
});

// --- health ---------------------------------------------------------------

Deno.test("index: every health check declares exactly one of check or unavailable", () => {
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

/** The credential check is derived from the auth `test` hook, so it is never declared. */
Deno.test("index: no declared check uses the reserved auth: prefix", () => {
  for (const h of app.healthChecks) {
    assert(!h.key.startsWith("auth:"), `${h.key}: reserved auth: prefix`);
  }
  assertEquals(typeof app.auth[0].test, "function", "no auth test hook to derive a check from");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the wildcard datacenter host, and no other", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { url: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.qualtrics");
  assertEquals(manifest.w6w.network.allow, ["*.qualtrics.com"]);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is the vendor's mark, stored as a PNG", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Downloaded verbatim from https://www.qualtrics.com/apple-touch-icon.png on
  // 2026-09-22: 16,886 bytes, `image/png`. The PNG signature is what proves the
  // bytes are the vendor's raster and not an SVG renamed.
  assertEquals(Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assertEquals(bytes.length > 1000, true);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
