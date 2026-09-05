import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 38;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
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
 * Every action that CREATES a new resource with no vendor-side idempotency
 * key must be `false`, or a runtime retry after a dropped connection turns
 * one create into two rows nobody asked for.
 */
Deno.test("index: no resource-creating action is marked idempotent", () => {
  for (
    const key of [
      "project-create",
      "project-duplicate",
      "section-create",
      "task-create",
      "subtask-create",
      "checklist-create",
      "checklist-item-create",
      "label-create",
      "task-label-add",
      "comment-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: a full-overwrite `PUT` or an end-state `DELETE` converges on
 * the same result no matter how many times it runs, so these are safe to
 * mark (and retry) as idempotent.
 */
Deno.test("index: every update/delete action is marked idempotent", () => {
  for (
    const key of [
      "project-update",
      "section-update",
      "task-update",
      "checklist-update",
      "checklist-delete",
      "checklist-item-update",
      "checklist-item-delete",
      "label-update",
      "label-delete",
      "task-label-remove",
      "comment-delete",
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
 * Strip comments so the sandbox guards below scan CODE, not prose — several
 * action files explicitly document, in comments, why they DON'T read a
 * credential or hard-code a host, and that prose would otherwise trip the
 * very assertion it explains.
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
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/meistertask\.com/.test(src), `${a.key}: contains a MeisterTask host literal`);
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

Deno.test("index: both auth methods declare test + sign, secret fields are type secret", () => {
  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
    for (const f of method.fields ?? []) {
      assertEquals(
        f.type,
        "secret",
        `${method.key}/${f.key}: credential field is not type "secret"`,
      );
    }
  }
});

/**
 * Both auth methods probe `/persons/me`, not `/persons` or a whoami that
 * could echo something sensitive. Pinned by path so a future edit toward a
 * more "obvious" endpoint has to do so deliberately.
 */
Deno.test("index: both auth methods probe /persons/me", async () => {
  for (const file of ["personal-access-token", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${file}.ts`, import.meta.url)));
    assert(src.includes("/persons/me"), `${file}: auth probe no longer hits /persons/me`);
  }
});

Deno.test("index: oauth2 method points at MindMeister's endpoints, not meistertask.com", () => {
  const oauth2 = app.auth.find((m) => m.key === "oauth2")!;
  assert(oauth2.oauth2?.authorizationUrl.startsWith("https://www.mindmeister.com/"));
  assert(oauth2.oauth2?.tokenUrl.startsWith("https://www.mindmeister.com/"));
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
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
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
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.meistertask");
  assert(manifest.w6w.network.allow.includes("www.meistertask.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.meistertask.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, downloaded verbatim", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from www.meistertask.com/pages/favicon/favicon.svg on
  // 2026-09-05: 1,456 bytes, a rounded hexagon with a checkmark-like glyph —
  // the recognisable full-color MeisterTask mark, not a monochrome favicon.
  assert(svg.includes('viewBox="0 0 66 66"'), "icon.svg viewBox changed — was it redrawn?");
  assert(svg.includes("#1891FF"), "vendor blue missing — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
