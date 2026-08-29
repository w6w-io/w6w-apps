import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 38;

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
 * None of these has a caller-supplied idempotency key, and each either mints a
 * new resource (create/duplicate/bulk-add) or drives an async job whose
 * effect depends on the workspace's current state at call time (move).
 */
Deno.test("index: creates, duplicates and the async move are marked non-idempotent", () => {
  for (
    const key of [
      "campaign-create",
      "campaign-duplicate",
      "lead-create",
      "lead-bulk-add",
      "lead-move",
      "account-create",
      "email-reply",
      "email-forward",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: each of these ends in the same state no matter how many
 * times it runs with the same input — a state-setting POST, a full-overwrite
 * PATCH, or a delete.
 */
Deno.test("index: state-setting and delete-shaped performs are marked idempotent", () => {
  for (
    const key of [
      "campaign-patch",
      "campaign-delete",
      "campaign-activate",
      "campaign-pause",
      "lead-patch",
      "lead-delete",
      "lead-bulk-delete",
      "lead-update-interest-status",
      "account-patch",
      "account-delete",
      "account-pause",
      "account-resume",
      "account-pause-bulk",
      "account-mark-fixed",
      "email-thread-mark-read",
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
 * The IMAP/SMTP passwords `account-create` provisions into Instantly are
 * mailbox credentials, not this app's own Connection credential — but they
 * are still credentials, and must be masked/encrypted like any other.
 */
Deno.test("index: account-create's mailbox passwords are declared secret", () => {
  const create = app.actions.find((a) => a.key === "account-create")!;
  for (const key of ["imap_password", "smtp_password"]) {
    const p = create.params?.find((p) => p.key === key);
    assertEquals(p?.type, "secret", `${key} must be type "secret"`);
  }
});

/**
 * Strip comments so the sandbox guards below scan CODE, not prose — several
 * action doc-comments in this app explain a `credential`/`token` word on
 * purpose (e.g. the account-create module doc).
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * `account-create`/`account-patch` are the one legitimate exception: they
 * carry the MAILBOX's own imap/smtp password as vendor-required request
 * fields, not this app's Connection credential. Every other action must
 * never reference a credential/token/bearer/api-key at all.
 */
Deno.test("index: no action reads this app's OWN credential — signing is the auth hook's job", async () => {
  const exempt = new Set(["account-create", "account-patch"]);
  for (const a of app.actions) {
    if (exempt.has(a.key)) continue;
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/\bauthorization\b/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
  }
});

Deno.test("index: account-create/patch touch only the mailbox's OWN imap/smtp secrets, never this app's own", async () => {
  for (const key of ["account-create", "account-patch"]) {
    const src = await actionSource(key);
    assert(!/\bauthorization\b/i.test(src), `${key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${key}: builds a bearer token`);
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
 * hard-coded a host — or accepted one as a param — could be pointed
 * somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/instantly\.ai/.test(src), `${a.key}: contains an Instantly host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /campaigns", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('"/campaigns"'), "auth probe no longer hits /campaigns");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "bearer");
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

/**
 * Both health checks in this app are declared absences — Instantly publishes
 * neither a status page nor a rate-limit-headroom signal (see the two
 * modules' doc comments). An `unavailable` entry always reports `unknown`,
 * which outranks `ok` in the roll-up, so at any severity but `informational`
 * these would pin the App's verdict at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 2, "expected both declared health checks to be absences");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and nothing else", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
      categories: string[];
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.instantly");
  assertEquals(manifest.w6w.network.allow, ["api.instantly.ai"]);
  assert(!manifest.w6w.network.allow.includes("status.instantly.ai"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

/**
 * The icon is a raster wrap: Instantly's own site links only PNG favicons
 * (no SVG mark exists to convert, and neither simple-icons nor n8n's
 * nodes-base ship one either — see the README). The vendor's 256x256 PNG
 * (`63f62e4d1df86f1bf7f133d5_cleaned_rounded.png`, fetched 2026-08-29) is
 * embedded verbatim as a base64 data URI, the same pattern this pack already
 * uses for `apps/gorgias`.
 */
Deno.test("index: the icon embeds the vendor's own 256x256 PNG mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith(
      '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="256" height="256" viewBox="0 0 256 256">',
    ),
    "icon.svg is not the expected 256x256 raster wrapper",
  );
  assert(svg.includes('xlink:href="data:image/png;base64,'), "no embedded PNG data URI found");
  // Pins the exact byte length of the file this app ships, so a re-fetch that
  // silently grabbed a different (e.g. re-compressed) asset fails loudly.
  assertEquals(svg.length, 3879, "icon.svg length changed — was the PNG re-fetched/re-encoded?");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
