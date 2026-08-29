import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

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
 * Draft creation/update, tag creation, and every comment-thread/comment
 * mutation that creates a new row have no vendor-documented dedupe key —
 * marking any of these `true` would let the runtime silently duplicate a
 * draft, tag, thread, or comment on a retried network error.
 */
Deno.test("index: nothing that creates a new row is marked idempotent", () => {
  for (
    const key of [
      "draft-create",
      "draft-update",
      "tag-create",
      "media-upload-create",
      "comment-thread-create",
      "comment-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: these really are safe to retry (delete-by-id, PUT-replace,
 * one-way resolve, or setting the same text twice), and saying so is what lets
 * the runtime recover from a dropped connection instead of failing the run.
 */
Deno.test("index: the genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "draft-delete",
      "queue-schedule-replace",
      "comment-thread-resolve",
      "comment-update",
      "comment-delete",
      "comment-thread-delete",
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
 * Strip comments so the sandbox guards below scan CODE, not the prose that
 * explains why an action stays away from a credential in the first place.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * `user-get`'s output legitimately names the vendor's own `api_key_label`
 * response field and its description mentions "API key" in plain English —
 * neither touches the credential. What must never appear in an action is code
 * that HANDLES one: reading `credential`, setting an `authorization` header,
 * building a `Bearer` string, or importing the credential type/wire-format
 * helper from `auth/api-key.ts`.
 */
Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/TypefullyCredential|authHeaders/.test(src), `${a.key}: reaches into auth/api-key.ts`);
    assert(!/from\s+["']\.\.\/auth\//.test(src), `${a.key}: imports from the auth directory`);
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
 * The API origin lives in `lib/client.ts` and nowhere else. Actions call it
 * exclusively through `TypefullyClient`, so a doc link in a `hint` (e.g.
 * "see https://typefully.com/docs/api") is fine, but the actual API host
 * `api.typefully.com` — and a raw `ctx.fetch` call that could bypass the
 * client and its `network.allow`-declared host — must appear nowhere in an
 * action.
 */
Deno.test("index: no action hard-codes the API host or calls ctx.fetch directly", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.typefully\.com/.test(src), `${a.key}: contains the API host literal`);
    assert(!/ctx\.fetch\s*\(/.test(src), `${a.key}: bypasses TypefullyClient with ctx.fetch`);
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

// --- media upload boundary ---------------------------------------------------

/**
 * `media-upload-create` returns a presigned URL; nothing in this app may then
 * try to PUT bytes to it, because that host is generated per-call and cannot
 * be in the static `network.allow`. See the action's own doc comment and
 * `index.ts`'s module doc for the full reasoning.
 */
Deno.test("index: nothing attempts to upload bytes to the presigned URL itself", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(
      !/upload_url.*fetch|fetch.*upload_url/is.test(src),
      `${a.key}: forwards upload_url into a fetch`,
    );
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the auth probe is GET /v2/me and nothing else", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('PROBE_PATH = "/me"'), "auth probe no longer targets /v2/me");
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

// --- health --------------------------------------------------------------------

Deno.test("index: every health check is either probing or declared unavailable", () => {
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
 * pins the App's verdict there forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the credential. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks) {
    if (h.network?.allow?.length) {
      assert(
        h.credential === "none" || h.credential === "context",
        `${h.key}: widens egress while signed`,
      );
    }
  }
});

// --- manifest ------------------------------------------------------------------

Deno.test("index: the manifest allows exactly the API host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.typefully");
  assertEquals(manifest.w6w.network.allow, ["api.typefully.com"]);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, normalized onto the pack's canvas", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  // Downloaded verbatim from typefully.com/icon/safari-pinned-tab.svg on
  // 2026-08-29, then re-framed by _tools/icon-normalize.ts. The path data
  // (the vendor's actual geometry) must survive that re-framing untouched.
  assert(
    svg.includes("m22.0781 28.9919c1.3619"),
    "the vendor's geometry changed — the mark was redrawn",
  );
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
