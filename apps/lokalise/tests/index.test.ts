import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 31;

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
 * Every "create" action on this API lacks a vendor idempotency key, and
 * `comment-create` is actively dangerous to retry (no dedupe of any kind on
 * comment text). None of these may be marked idempotent.
 */
Deno.test("index: no create/upload action is marked idempotent", () => {
  for (
    const key of [
      "project-create",
      "key-create",
      "language-create",
      "contributor-create",
      "comment-create",
      "task-create",
      "webhook-create",
      "file-upload",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: every update/delete action here is a full overwrite or a
 * delete-to-the-same-end-state, so retrying it is safe.
 */
Deno.test("index: every update/delete action is marked idempotent", () => {
  for (
    const key of [
      "project-update",
      "project-delete",
      "key-update",
      "key-delete",
      "translation-update",
      "webhook-delete",
      "file-delete",
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
 * comment explaining *why* an action never touches the credential would
 * otherwise trip the very assertion it is documenting the absence of.
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
    assert(!/authorization/i.test(src), `${a.key}: sets an authorization header itself`);
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
    assert(!/lokalise\.com/i.test(src), `${a.key}: contains a Lokalise host literal`);
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

/**
 * The auth probe is pinned by path. `GET /users/{user_id}` is the tempting
 * "whoami" alternative, but it requires a `user_id` no fresh Connection has
 * yet — there is no `/users/me` on this API.
 */
Deno.test("index: the auth probe is /projects", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-token.ts", import.meta.url)));
  assert(src.includes("/projects"), "auth probe no longer hits /projects");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/users\//.test(src),
    "the probe was pointed at a /users/{id} path, which this API has no self-referencing form of",
  );
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-token");
  assertEquals(method.type, "apiKey");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
  assertEquals(method.apiKey?.name, "X-Api-Token");
  assertEquals(method.apiKey?.in, "header");
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

/** This app declares no `unavailable` checks — every metered dimension it knows about is readable. */
Deno.test("index: no health check is a declared absence — everything here is a live probe", () => {
  assertEquals(app.healthChecks.filter((h) => h.unavailable).length, 0);
  for (const h of app.healthChecks) {
    assertEquals(typeof h.check, "function", `${h.key}: expected a live check`);
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
  assertEquals(manifest.w6w.id, "io.w6w.lokalise");
  assert(manifest.w6w.network.allow.includes("api.lokalise.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.lokalise.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(manifest.w6w.network.allow.length === 1, "unexpected extra host in network.allow");
});

Deno.test("index: the icon is the vendor's own mark, on the pack's normalized canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Extracted from Lokalise's own homepage logo asset
  // (https://lokalise.com/uploads/Lokalise_logo_black_13918712fa.svg, fetched
  // 2026-09-01) — the standalone icon mark (a polygon + two rects) that
  // precedes the wordmark glyphs in that file, then re-framed by the pack's
  // `_tools/icon-normalize.ts` onto the shared `0 0 100 100` canvas.
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  // The re-frame changes the outer viewBox and nests the original inside a
  // child <svg> with its own viewBox — the vendor's own path data (the
  // polygon's point list) must survive untouched.
  assert(
    svg.includes("524.7,376.1 431.9,376.1"),
    "the vendor's geometry changed — the mark was redrawn",
  );
  assert(svg.includes("#1D1D1B"), "vendor colour missing — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
