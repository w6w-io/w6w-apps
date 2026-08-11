import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

/**
 * One action per documented endpoint — Motion publishes 27 reference pages and
 * this app implements all 27. The equality is asserted against the derived path
 * set further down, not just against this number.
 */
const ACTION_COUNT = 27;

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
 * Motion documents no idempotency key on any endpoint, so every creating action
 * duplicates its object on a retry. Marking one of these `true` would license
 * the runtime to turn a dropped connection into two tasks — or, for the
 * recurring one, into a second definition that goes on generating tasks forever.
 */
Deno.test("index: no creating action is marked idempotent", () => {
  for (
    const key of [
      "task-create",
      "project-create",
      "comment-create",
      "recurring-task-create",
      "custom-field-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these eight
 * leave the same end state after one call and after five, and saying so is what
 * lets the runtime recover from a dropped connection instead of failing a run.
 */
Deno.test("index: the genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "task-update",
      "task-move",
      "task-delete",
      "task-unassign",
      "recurring-task-delete",
      "custom-field-delete",
      "custom-field-value-set-task",
      "custom-field-value-set-project",
      "custom-field-value-delete-task",
      "custom-field-value-delete-project",
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
 * assertion, while a reviewer's natural fix — deleting the explanation — would
 * leave a real violation just as invisible.
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

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/usemotion\.com/.test(src), `${a.key}: contains a Motion host literal`);
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

// --- the request surface, derived rather than hand-listed --------------------

/**
 * Every request an action builds, as `METHOD /path`, derived from the source.
 *
 * `${V1}` and `${BETA}` are resolved to their literal prefixes first — the whole
 * point of the exercise is that Motion serves two prefixes on one host and the
 * wrong one is a router 404 — and every other `${…}` collapses to `{}`.
 */
function requestCalls(src: string): string[] {
  const method = src.match(/method:\s*"([A-Z]+)"/)?.[1] ?? "GET";
  const out: string[] = [];
  for (const m of src.matchAll(/`([^`]*)`/g)) {
    const raw = m[1].replace(/\$\{V1\}/g, "/v1").replace(/\$\{BETA\}/g, "/beta");
    if (!raw.startsWith("/v1") && !raw.startsWith("/beta")) continue;
    out.push(`${method} ${raw.replace(/\$\{[^}]*\}/g, "{}")}`);
  }
  return out;
}

/**
 * The 27 endpoints Motion's reference documents, transcribed from the sidebar of
 * `docs.usemotion.com` on 2026-08-11 — the same 27 that were each confirmed to
 * exist by an unauthenticated probe (a known route answers 401 from the auth
 * guard, an unknown one answers `404 Cannot <VERB> <path>` from the router).
 */
const DOCUMENTED_ENDPOINTS = [
  "GET /v1/tasks",
  "GET /v1/tasks/{}",
  "POST /v1/tasks",
  "PATCH /v1/tasks/{}",
  "PATCH /v1/tasks/{}/move",
  "DELETE /v1/tasks/{}",
  "DELETE /v1/tasks/{}/assignee",
  "GET /v1/projects",
  "GET /v1/projects/{}",
  "POST /v1/projects",
  "GET /v1/comments",
  "POST /v1/comments",
  "GET /v1/recurring-tasks",
  "POST /v1/recurring-tasks",
  "DELETE /v1/recurring-tasks/{}",
  "GET /v1/workspaces",
  "GET /v1/users",
  "GET /v1/users/me",
  "GET /v1/statuses",
  "GET /v1/schedules",
  "GET /beta/workspaces/{}/custom-fields",
  "POST /beta/workspaces/{}/custom-fields",
  "DELETE /beta/workspaces/{}/custom-fields/{}",
  "POST /beta/custom-field-values/task/{}",
  "POST /beta/custom-field-values/project/{}",
  "DELETE /beta/custom-field-values/task/{}/custom-fields/{}",
  "DELETE /beta/custom-field-values/project/{}/custom-fields/{}",
];

/**
 * The surface, both ways: every documented endpoint is implemented, and no
 * action calls anything that is not documented.
 *
 * Derived from each action's own source, so a new action calling an undocumented
 * path — or a typo'd `/v1` on a `/beta` route — fails here rather than shipping.
 */
Deno.test("index: the actions call exactly the 27 documented endpoints", async () => {
  const called: string[] = [];
  for (const a of app.actions) {
    const calls = requestCalls(await actionSource(a.key));
    assertEquals(
      calls.length,
      1,
      `${a.key}: expected exactly one request path, got ${calls.length}`,
    );
    called.push(calls[0]);
  }
  assertEquals(new Set(called).size, called.length, "two actions build the same request");
  assertEquals(called.slice().sort(), DOCUMENTED_ENDPOINTS.slice().sort());
  // A derivation that found nothing would pass vacuously and prove nothing.
  assertEquals(called.length, ACTION_COUNT);
});

Deno.test("index: the request-path derivation actually finds paths", () => {
  assertEquals(requestCalls("x(`${V1}/tasks`)"), ["GET /v1/tasks"]);
  assertEquals(
    requestCalls('x(`${BETA}/workspaces/${encodeId(id)}/custom-fields`, {method: "POST"})'),
    ["POST /beta/workspaces/{}/custom-fields"],
  );
  // A template literal that is not a request path must not be picked up.
  assertEquals(requestCalls("const s = `hello ${name}`;"), []);
});

/**
 * Motion validates `Content-Type: application/json` **before routing and before
 * auth**: a POST or PATCH without it is refused with
 * `400 {"message":"Invalid Headers","error":"Content-Type must be application/json"}`,
 * on paths that do not exist and with no credential attached. `MotionClient`
 * sets that header if and only if `body` is present, so a mutating call that
 * forgot to pass a body would be rejected for a reason that names none of the
 * three things actually wrong.
 */
Deno.test("index: every POST/PATCH action passes a body, so content-type is set", async () => {
  const mutating: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (!/method:\s*"(POST|PATCH)"/.test(src)) continue;
    mutating.push(a.key);
    assert(/\bbody:/.test(src), `${a.key}: POST/PATCH without a body — Motion will 400 it`);
  }
  // Seven creates plus task-update and task-move. A count that drifted would
  // mean this guard stopped covering something.
  assertEquals(mutating.length, 9, `expected 9 mutating actions, found: ${mutating.join(", ")}`);
});

// --- auth ------------------------------------------------------------------

/**
 * The probe is pinned by path and by header name.
 *
 * Choosing a probe is the step where a credential most easily leaks back out —
 * Mailjet's `/apikey`, Follow Up Boss's `/me` and ElevenLabs' `/v1/user` all
 * return a live secret to a caller that already has one. Motion's whoami returns
 * `{id, name, email}` and nothing else, which is why it is safe here; if someone
 * repoints it, this makes them do it deliberately.
 */
Deno.test("index: the auth probe is GET /v1/users/me on the X-API-Key header", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(/PROBE_PATH\s*=\s*`\$\{V1\}\/users\/me`/.test(src), "auth probe moved off /v1/users/me");
  assert(/AUTH_HEADER\s*=\s*"x-api-key"/.test(src), "the auth header name changed");
  // Motion accepts no query form for the key, and a workflow host logs URLs
  // while it does not log headers — so the credential must never touch a URL.
  assert(!/searchParams|\?apiKey|\?key=|\?token/.test(src), "the key reached a query string");
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
  assertEquals(method.apiKey?.name, "X-API-Key");
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

// --- health ----------------------------------------------------------------

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
 * in the roll-up, so at any severity but `informational` a declared absence pins
 * the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/**
 * The `service` check is a live probe of a real status page, and it is still
 * `informational` on purpose: `status.usemotion.com` carries one component,
 * `Webapp`, reporting `not_monitored`, and nothing covering `api.usemotion.com`.
 * At the `degraded` default, an evidence-free roll-up over an unmonitored
 * component would be allowed to move a verdict about the API.
 */
Deno.test("index: the service check cannot worsen a verdict about the API", () => {
  const service = app.healthChecks.find((h) => h.key === "service");
  assert(service, "no service check");
  assertEquals(typeof service.check, "function", "service should be a live probe, not an absence");
  assertEquals(service.severity, "informational");
});

/** A check that widens egress must be unsigned — a status host never sees the key. */
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
  assertEquals(manifest.w6w.id, "io.w6w.motion");
  assertEquals(manifest.w6w.network.allow, ["api.usemotion.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.usemotion.com"));
  // 127.0.0.1 has no business in a first-party manifest.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from www.usemotion.com/favicon.svg on 2026-08-11:
  // 4,424 bytes, a 126x126 square generated by Pixelmator Pro.
  assertEquals(svg.length, 4424, "icon.svg is no longer the 4,424-byte vendor file");
  assert(svg.includes('viewBox="0 0 126 126"'));
  assert(svg.includes("Generated by Pixelmator Pro"), "the vendor's own header line is gone");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
