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
 * Every create/duplicate/action-trigger endpoint in this app's covered
 * surface accepts no idempotency key of any kind, so a retry starts a
 * genuinely new resource (a second form, a second question, a second tag, a
 * duplicated question). Marking any of these `true` would let the runtime
 * silently double up a caller's data on retry.
 */
Deno.test("index: no resource-creating action is marked idempotent", () => {
  for (
    const key of [
      "form-create",
      "form-duplicate",
      "question-create",
      "question-duplicate",
      "respondent-create",
      "tag-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: every one of these applies the same PATCH/PUT/DELETE state
 * unconditionally, so replaying it has no further effect — which is what
 * lets the runtime retry a dropped connection safely.
 */
Deno.test("index: every partial-update/delete action is marked idempotent", () => {
  for (
    const key of [
      "form-update",
      "form-restore",
      "form-delete",
      "contact-delete",
      "conversation-mark-read",
      "question-update",
      "question-delete",
      "respondent-update",
      "respondent-delete",
      "media-update",
      "tag-update",
      "tag-delete",
      "contact-tag-set",
      "webhook-upsert",
      "webhook-delete",
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
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed
 * somewhere the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/videoask\.com/.test(src), `${a.key}: contains a VideoAsk host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|access_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/**
 * Every action whose params carry a VideoAsk resource id (form/question/
 * contact/tag/respondent/media/webhook id) path-escapes it via `encodeId`
 * before building a URL — an unescaped id interpolated straight into a
 * template-literal path could smuggle in an extra path segment.
 */
Deno.test("index: every action with a resource-id param uses encodeId in its path", async () => {
  const idParamKeys = new Set([
    "formId",
    "questionId",
    "contactId",
    "tagId",
    "respondentId",
    "mediaId",
    "brandingId",
    "webhookTag",
  ]);
  // question-create's formId is a body field (form_id), never a path segment —
  // POST /questions takes no id in its URL — so it is exempt.
  const noPathId = new Set(["question-create"]);
  for (const a of app.actions) {
    if (noPathId.has(a.key)) continue;
    const hasIdParam = (a.params ?? []).some((p) => idParamKeys.has(p.key));
    if (!hasIdParam) continue;
    const src = await actionSource(a.key);
    assert(/encodeId\(/.test(src), `${a.key}: has a resource-id param but never calls encodeId`);
  }
});

// --- auth --------------------------------------------------------------

Deno.test("index: the auth probe is /me, not a resource that could leak a credential", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/oauth2.ts", import.meta.url)));
  assert(src.includes("/me`"), "auth probe no longer hits /me");
});

Deno.test("index: oauth2 requests offline_access, so a Connection survives token expiry", () => {
  const [method] = app.auth;
  assertEquals(method.type, "oauth2");
  const scopes = (method as unknown as { oauth2?: { scopes?: string[] } }).oauth2?.scopes ?? [];
  assert(scopes.includes("offline_access"), "oauth2 config is missing offline_access");
});

Deno.test("index: oauth2 sends the Auth0 audience param required for an API access token", () => {
  const [method] = app.auth;
  const extra =
    (method as unknown as { oauth2?: { extraAuthParams?: Record<string, string> } }).oauth2
      ?.extraAuthParams ?? {};
  assertEquals(extra.audience, "https://api.videoask.com/");
});

Deno.test("index: every auth field is declared secret where it carries a credential", () => {
  const [method] = app.auth;
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

Deno.test("index: the manifest allows only the API host, not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; categories: string[] } };
  assertEquals(manifest.w6w.id, "io.w6w.videoask");
  assertEquals(manifest.w6w.network.allow, ["api.videoask.com"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});
