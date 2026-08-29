import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 44;

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
 * Endpoints Apollo documents with NO idempotency mechanism at all: a retry is a second,
 * separately-created record.
 */
Deno.test("index: create-only actions with no dedup/idempotency-key mechanism are false", () => {
  for (
    const key of [
      "account-create", // Apollo applies NO deduplication here at all
      "contact-create", // has an opt-in run_dedupe, but off by default
      "deal-create",
      "task-create",
      "list-create", // a duplicate name errors rather than returning the existing list
      "sequence-create",
      "sequence-add-contacts",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: PATCH/PUT-style updates that set absolute field values, and
 * complete/skip/remove-style transitions whose end state doesn't change on retry.
 */
Deno.test("index: absolute-update and terminal-transition actions are marked idempotent", () => {
  for (
    const key of [
      "account-update",
      "contact-update",
      "contact-stage-update",
      "deal-update",
      "sequence-update",
      "sequence-remove-contacts",
      "task-update",
      "task-complete",
      "task-skip",
      "list-update",
      "list-add-records",
      "list-remove-records",
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
 * Without this the checks are simultaneously too weak and too strong: a doc comment
 * explaining *why* an action never touches the credential trips the assertion, while a
 * reviewer's natural fix — deleting the explanation — would leave a real violation just
 * as invisible.
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
    assert(!/x-api-key/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/api[_-]?key\s*:/i.test(src), `${a.key}: builds an apiKey field itself`);
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
 * The API origin lives in `lib/client.ts` and nowhere else. `apollo.io` bare shows up
 * legitimately in a few hints/placeholders (an example domain, `tim@apollo.io`) — the
 * thing that actually matters is the API HOST, which an action must never hard-code or
 * accept as a param (it could then be pointed somewhere the manifest never allowlisted).
 */
Deno.test("index: no action hard-codes the API host or an absolute URL", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.apollo\.io/i.test(src), `${a.key}: contains the Apollo API host literal`);
    assert(!/https?:\/\/api\./i.test(src), `${a.key}: contains an absolute API URL`);
  }
});

/**
 * Unlike a multi-tenant-subdomain API, Apollo has exactly one fixed host — so `domain`
 * here is a legitimate business field (a person's or company's own domain), not
 * connection identity. What must never leak in is the credential itself.
 */
Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|base_?url|api_?key|api_?token|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- auth --------------------------------------------------------------------

/**
 * The auth probe is pinned by path. Apollo's own docs show a curl example against
 * `auth/health`, which is unusable as a probe (see `auth/api-key.ts`) — if someone
 * "fixes" it back to that endpoint, this makes them do it deliberately.
 */
Deno.test("index: the auth probe is GET /users/api_profile, not auth/health", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/users/api_profile"), "auth probe no longer hits /users/api_profile");
  assert(
    !/["'`]\/auth\/health["'`]/.test(src),
    "the probe was pointed at the undocumented auth/health",
  );
});

Deno.test("index: the credential field is declared secret", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "apiKey");
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

/** A check that widens egress must be unsigned — a status host must never see the API key. */
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

Deno.test("index: the service check's imperfect API coverage is reflected as informational", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.apollo");
  assert(manifest.w6w.network.allow.includes("api.apollo.io"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.apollo.io"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon file exists and is the vendor's own served asset", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"), "icon.svg does not look like an SVG document");
  assert(svg.length > 0);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
