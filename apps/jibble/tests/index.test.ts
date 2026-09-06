import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

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

/**
 * Clock in/out and every create create a new row with no documented dedupe key — retrying
 * one on a dropped connection risks a double clock-in or a duplicate record.
 */
Deno.test("index: no create/clock-in/clock-out action is marked idempotent", () => {
  for (
    const key of [
      "member-create",
      "location-create",
      "time-entry-clock-in",
      "time-entry-clock-out",
      "time-off-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/** The converse: a `PATCH`/`DELETE` by id genuinely is safe to retry. */
Deno.test("index: every by-id update/archive/delete is marked idempotent", () => {
  for (
    const key of [
      "member-update",
      "member-archive",
      "member-delete",
      "time-entry-update",
      "time-entry-archive",
      "time-off-update-status",
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
 * Strip comments so the sandbox guards below scan CODE, not prose — a doc comment explaining
 * *why* an action never touches the credential would otherwise trip the assertion.
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
    assert(!/client[_-]?secret/i.test(src), `${a.key}: touches the client secret`);
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
 * Every host lives in `lib/client.ts` and nowhere else. An action that hard-coded a host —
 * or accepted one as a param — could be pointed somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a jibble.io host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/jibble\.io/.test(src), `${a.key}: contains a Jibble host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|client_?id|client_?secret|token|access_?token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the credential fields are declared secret", () => {
  const [method] = app.auth!;
  assertEquals(method.key, "client-credentials");
  assertEquals(method.type, "custom");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/** The token endpoint is form-urlencoded client_credentials, pinned by path and content-type. */
Deno.test("index: the auth exchange hits /connect/token, form-urlencoded", async () => {
  const src = code(
    await Deno.readTextFile(new URL("../auth/client-credentials.ts", import.meta.url)),
  );
  assert(src.includes("/connect/token") || src.includes("TOKEN_URL"), "no /connect/token");
  assert(src.includes("x-www-form-urlencoded"), "token request is not form-urlencoded");
});

// --- health --------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks!) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok` in the roll-up,
 * so at any severity but `informational` a declared absence pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks!.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 2, "expected both declared-absence checks");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows exactly the four hosts this app calls", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.jibble");
  assertEquals(
    manifest.w6w.network.allow.slice().sort(),
    [
      "identity.prod.jibble.io",
      "time-attendance.prod.jibble.io",
      "time-tracking.prod.jibble.io",
      "workspace.prod.jibble.io",
    ],
  );
  // The status host was never verified as real for Jibble, so it must never appear here.
  assert(!manifest.w6w.network.allow.some((h) => h.includes("status")));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, fetched verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from jibble.io/wp-content/themes/jibble-theme/img/jibble-logo.svg on
  // 2026-09-06: 6272 bytes, a 364x84 wordmark+glyph lockup.
  assert(svg.startsWith('<svg width="364" height="84" viewBox="0 0 364 84"'));
  assertEquals(svg.length, 6272);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// client_secret\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
