import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 29;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
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
 * Every create endpoint in this app's covered surface documents no
 * idempotency key of any kind (unlike, say, Stripe), so a retry always
 * duplicates work — booking time twice, posting a comment twice, creating a
 * second task or folder.
 */
Deno.test("index: no create action is marked idempotent", () => {
  for (const key of ["task-create", "folder-create", "comment-create", "timelog-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: updates and deletes ARE safe to retry — Wrike's update
 * endpoints merge/replace rather than append, and a repeat delete just 404s.
 */
Deno.test("index: every update/delete action is marked idempotent", () => {
  for (
    const key of [
      "task-update",
      "task-delete",
      "folder-update",
      "folder-delete",
      "comment-update",
      "comment-delete",
      "contact-update",
      "timelog-update",
      "timelog-delete",
      "attachment-delete",
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
 * The three regional hosts live in `lib/client.ts` and the auth field's
 * `options`, and nowhere else. An action hard-coding one would silently break
 * for every account on a different data center.
 */
Deno.test("index: no action hard-codes a Wrike host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/wrike\.com/.test(src), `${a.key}: contains a Wrike host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: every action reads its host from the connection, not a param", () => {
  const banned = /^(host|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: every action calls hostFromConnection rather than assuming a default host", async () => {
  // account-get and version-get take no params at all but still need the
  // right host, so they must call the helper too.
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(src.includes("hostFromConnection("), `${a.key}: does not resolve its host`);
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the credential field is declared secret, the host field is not", () => {
  const [method] = app.auth;
  assertEquals(method.key, "permanent-token");
  assertEquals(method.type, "bearer");
  const token = method.fields?.find((f) => f.key === "token");
  const host = method.fields?.find((f) => f.key === "host");
  assertEquals(token?.type, "secret");
  assertEquals(host?.type, "select");
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/** The auth probe is pinned by path — see auth/permanent-token.ts for why. */
Deno.test("index: the auth probe is /version, not the account-scoped contacts read", async () => {
  const src = code(
    await Deno.readTextFile(new URL("../auth/permanent-token.ts", import.meta.url)),
  );
  assert(src.includes("/version"), "auth probe no longer hits /version");
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

Deno.test("index: exactly one health check actually probes — service and quota are both unavailable", () => {
  const probing = app.healthChecks.filter((h) => typeof h.check === "function");
  assertEquals(probing.map((h) => h.key), ["account"]);
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows all three Wrike hosts", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { url: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.wrike");
  for (const host of ["www.wrike.com", "app-eu.wrike.com", "app-us2.wrike.com"]) {
    assert(manifest.w6w.network.allow.includes(host), `manifest does not allow ${host}`);
  }
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: the icon is a real PNG, decoded from the vendor's own favicon.ico", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // PNG signature.
  assertEquals(Array.from(bytes.slice(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(bytes.length > 200, "icon.png is suspiciously small");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
