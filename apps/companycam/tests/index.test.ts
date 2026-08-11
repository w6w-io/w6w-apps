import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { WEBHOOK_SCOPES } from "../lib/webhook-scopes.ts";

/** One action per operation in CompanyCam's OpenAPI document. */
const ACTION_COUNT = 62;

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
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      for (const child of p.children ?? []) {
        assert(child.key && child.label, `${a.key}/${p.key}: child param without key or label`);
      }
    }
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * CompanyCam's API accepts no idempotency key of any kind — no header, no body
 * field, no create-or-update endpoint — so every one of these creates a second
 * record when retried. The runtime may retry an action marked idempotent;
 * marking any of these `true` turns one dropped connection into a duplicate
 * project, a duplicate comment, or a webhook that delivers everything twice
 * forever.
 *
 * Stated as an exact set rather than a list of examples, so a new `perform`
 * action has to be classified deliberately.
 */
Deno.test("index: exactly the record-creating performs are non-idempotent", () => {
  const expected = [
    "group-create",
    "photo-comment-create",
    "photo-tag-add",
    "project-checklist-create",
    "project-comment-create",
    "project-create",
    "project-document-create",
    "project-invitation-create",
    "project-label-add",
    "project-photo-create",
    "tag-create",
    "user-create",
    "webhook-create",
  ];
  const actual = app.actions
    .filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key)
    .sort();
  assertEquals(actual, expected);
});

// --- source-level sandbox guards -------------------------------------------

/**
 * Strip comments so the guards below scan CODE, not prose.
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
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/companycam\.com/.test(src), `${a.key}: contains a CompanyCam host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * The connection's own identity and credential must never be collected again as
 * an action param — that is how an app ends up with two sources of truth for
 * who it is talking to, and with a credential in a workflow definition.
 *
 * A bare `token` is deliberately NOT on this list, and the exception is a real
 * one rather than a carve-out for a violator: `webhook-create`/`webhook-update`
 * take a `token` that is the **caller's own** signing secret for their **own**
 * receiver, which CompanyCam's create-webhook body requires and without which no
 * delivery can be verified. It is not this connection's credential, and there is
 * no way to express the operation without it.
 *
 * The compensating rule below is what keeps that from being a hole: any param
 * whose name reads like a secret must be declared `type: "secret"`, so the host
 * masks it in the UI and encrypts it at rest. Together the two rules are
 * stronger than the old single name-ban, which said nothing about how a
 * differently-named secret was stored.
 */
Deno.test("index: the connection's own identity is never an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|access_?token|bearer|company)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: every secret-shaped param is declared secret", () => {
  const secretish = /(secret|password|token|passphrase)/i;
  const found: string[] = [];
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      if (!secretish.test(p.key)) continue;
      found.push(`${a.key}/${p.key}`);
      assertEquals(p.type, "secret", `${a.key}/${p.key}: secret-shaped param is not type secret`);
    }
  }
  // Not vacuous: the webhook signing token on create and update, and the user
  // password on create and update.
  assertEquals(found.sort(), [
    "user-create/password",
    "user-update/password",
    "webhook-create/token",
    "webhook-update/token",
  ]);
});

// --- the request paths, derived rather than trusted -------------------------

/**
 * Every request path an action builds, with `${…}` interpolations collapsed to
 * `{}` — derived from the source rather than hand-listed, so a new action is
 * covered the moment it is written.
 */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

/**
 * The 36 path templates CompanyCam's OpenAPI document declares, transcribed
 * from it (`{name}` collapsed to `{}` because the parameter names differ
 * between operations on the same path).
 *
 * This is what stops an action from reaching a plausible-looking endpoint that
 * does not exist — which on this API does not 404, it answers 200 with an HTML
 * login page (see `lib/client.ts`).
 */
const DOCUMENTED_PATHS = new Set([
  "/checklists",
  "/company",
  "/groups",
  "/groups/{}",
  "/photos",
  "/photos/{}",
  "/photos/{}/comments",
  "/photos/{}/descriptions",
  "/photos/{}/tags",
  "/projects",
  "/projects/{}",
  "/projects/{}/archive",
  "/projects/{}/assigned_users",
  "/projects/{}/assigned_users/{}",
  "/projects/{}/checklists",
  "/projects/{}/checklists/{}",
  "/projects/{}/collaborators",
  "/projects/{}/comments",
  "/projects/{}/documents",
  "/projects/{}/invitations",
  "/projects/{}/labels",
  "/projects/{}/labels/{}",
  "/projects/{}/notepad",
  "/projects/{}/photos",
  "/projects/{}/restore",
  "/projects/{}/videos",
  "/tags",
  "/tags/{}",
  "/templates/checklists",
  "/users",
  "/users/current",
  "/users/{}",
  "/videos",
  "/videos/{}",
  "/webhooks",
  "/webhooks/{}",
]);

Deno.test("index: every action requests a path CompanyCam documents", async () => {
  let checked = 0;
  for (const a of app.actions) {
    const paths = requestPaths(await actionSource(a.key));
    assert(paths.length > 0, `${a.key}: no request path found in the source`);
    for (const p of paths) {
      assert(DOCUMENTED_PATHS.has(p), `${a.key}: requests undocumented path ${p}`);
      checked++;
    }
  }
  // A derivation that found nothing would pass vacuously: 62 actions, each
  // building exactly one path literal.
  assertEquals(checked, ACTION_COUNT, `expected ${ACTION_COUNT} request paths, found ${checked}`);
});

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("project-photo-list");
  assert(
    requestPaths(src).includes("/projects/{}/photos"),
    "requestPaths no longer recognises a template-literal path — the invariant above is blind",
  );
  assertEquals(requestPaths('const p = "/users/current";'), ["/users/current"]);
  assertEquals(requestPaths("const p = `/photos/${id}/tags`;"), ["/photos/{}/tags"]);
});

// --- the webhook-secret invariant, derived both ways ------------------------

/**
 * `Webhook.token` is the HMAC key CompanyCam signs deliveries with, and it
 * comes back on every read of `/webhooks`. The invariant runs both ways: an
 * action that touches a webhook path MUST strip, and an action that strips MUST
 * have a reason to — the second half is what stops the rule decaying into a
 * decorative call nobody can justify.
 *
 * `webhook-delete` is the one webhook action outside the set: it answers 204
 * with no body, so there is nothing to strip.
 */
Deno.test("index: exactly the actions reading a webhook body strip its token", async () => {
  const touching: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    const paths = requestPaths(src);
    // `.list<T>(` as well as `.list(` — an earlier version of this derivation
    // missed `webhook-list` because it carries an explicit type argument, and
    // scored a stripping action as one with nothing to strip.
    const readsWebhookBody = paths.some((p) => p.startsWith("/webhooks")) &&
      /\.(json|list)\s*[<(]/.test(src);
    if (readsWebhookBody) touching.push(a.key);
    if (/\bstripWebhookSecrets?\s*\(|stripWebhookSecrets?\)/.test(src)) stripping.push(a.key);
  }
  assertEquals(
    touching.slice().sort(),
    stripping.slice().sort(),
    `actions reading a webhook body: ${touching.sort().join(", ")} · ` +
      `actions stripping: ${stripping.sort().join(", ")}`,
  );
  assertEquals(touching.length, 4, `expected 4 webhook-body actions, found ${touching.length}`);
});

// --- impersonation ----------------------------------------------------------

/**
 * The impersonation param is offered on exactly the 14 operations whose
 * OpenAPI definition declares `X-CompanyCam-User`. Offering it anywhere else
 * would promise an attribution the API will not honour.
 */
Deno.test("index: the act-as param appears on exactly the 14 documented operations", () => {
  const expected = [
    "group-create",
    "photo-comment-create",
    "photo-delete",
    "project-checklist-create",
    "project-comment-create",
    "project-create",
    "project-document-create",
    "project-invitation-create",
    "project-photo-create",
    "project-user-assign",
    "project-user-remove",
    "user-create",
    "user-delete",
    "user-update",
  ];
  const actual = app.actions
    .filter((a) => (a.params ?? []).some((p) => p.key === "actAs"))
    .map((a) => a.key)
    .sort();
  assertEquals(actual, expected);
});

/**
 * The header spelling is pinned. CompanyCam's guide writes
 * `X_COMPANYCAM_USER` and its OpenAPI document writes `X-CompanyCam-User`;
 * those are two different headers, nginx drops the underscored one by default,
 * and the failure is silent — the write is credited to the token's owner
 * instead of the named user. This makes a change deliberate.
 */
Deno.test("index: the impersonation header is the dashed form the OpenAPI document declares", async () => {
  const src = code(await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url)));
  assert(
    /ACT_AS_HEADER\s*=\s*"x-companycam-user"/.test(src),
    "the impersonation header is no longer the dashed x-companycam-user form",
  );
  assert(
    !/x_companycam_user/i.test(src),
    "the underscored header spelling is nginx-dropped by default and must not be sent",
  );
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out.
 * `GET /v2/webhooks` needs a credential and looks like a fine liveness check,
 * but every row of its response carries `token`, the key that signs webhook
 * deliveries. `/v2/users/current` requires a credential, is reachable with the
 * narrowest scope CompanyCam issues (`read`), and returns only the account
 * holder's own profile.
 */
Deno.test("index: both auth methods probe /users/current", async () => {
  for (const file of ["access-token", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${file}.ts`, import.meta.url)));
    assert(src.includes("/users/current") || src.includes("PROBE_PATH"), `${file}: no probe path`);
  }
  const accessTokenSrc = code(
    await Deno.readTextFile(new URL("../auth/access-token.ts", import.meta.url)),
  );
  assert(
    /PROBE_PATH\s*=\s*"\/users\/current"/.test(accessTokenSrc),
    "the auth probe is no longer /users/current",
  );
});

Deno.test("index: nothing in auth or health probes a webhook endpoint", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/["'`]\/webhooks/.test(src), `${dir}/${entry.name}: probes /webhooks`);
    }
  }
});

Deno.test("index: every credential field is declared secret", () => {
  const keys = app.auth.map((m) => m.key).sort();
  assertEquals(keys, ["access-token", "oauth2"]);
  for (const method of app.auth) {
    for (const f of method.fields ?? []) {
      assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not secret`);
    }
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
  }
});

Deno.test("index: the OAuth method declares the vendor's endpoints, scopes and refresh URL", () => {
  const method = app.auth.find((m) => m.key === "oauth2")!;
  assertEquals(method.type, "oauth2");
  assertEquals(method.oauth2?.authorizationUrl, "https://app.companycam.com/oauth/authorize");
  assertEquals(method.oauth2?.tokenUrl, "https://app.companycam.com/oauth/token");
  // Access tokens last 7,200 seconds and refresh tokens rotate, so the host has
  // to be told where to renew — without this a connection dies after two hours.
  assertEquals(method.oauth2?.refreshUrl, "https://app.companycam.com/oauth/token");
  assertEquals(method.oauth2?.scopes, ["read", "write", "destroy"]);
  // The vendor documents a confidential client with a client_secret and never
  // mentions PKCE; claiming it would silently drop the protection it implies.
  assertEquals(method.oauth2?.pkce, false);
});

// --- webhook scopes ---------------------------------------------------------

Deno.test("index: the webhook scope vocabulary is the vendor's closed list", () => {
  // 29 rows in the guide's Scopes table, transcribed verbatim.
  assertEquals(WEBHOOK_SCOPES.length, 29);
  assertEquals(new Set(WEBHOOK_SCOPES).size, 29, "duplicate scope");
  for (
    const required of ["*", "project.*", "photo.created", "todo_list.completed", "task.completed"]
  ) {
    assert(WEBHOOK_SCOPES.includes(required), `scope ${required} missing`);
  }
  // Checklist events are spelled todo_list.*; a checklist.* scope does not exist.
  assert(!WEBHOOK_SCOPES.some((s) => s.startsWith("checklist.")), "invented a checklist.* scope");
  for (const scope of WEBHOOK_SCOPES) {
    assert(/^(\*|[a-z_]+\.(\*|[a-z_]+))$/.test(scope), `malformed scope: ${scope}`);
  }
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
 * in the roll-up, so at any severity but `informational` a declared absence
 * pins the app at `unknown` forever.
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
  ) as {
    w6w: {
      id: string;
      network: { allow: string[] };
      appearance: { icon: { url?: string; alt?: string } };
      categories: string[];
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.companycam");
  assertEquals(manifest.w6w.network.allow, ["api.companycam.com"]);
  // The status host belongs to the health check's own allowlist, and the OAuth
  // host is allowlisted implicitly by the runtime — neither belongs here.
  assert(!manifest.w6w.network.allow.includes("status.companycam.com"));
  assert(!manifest.w6w.network.allow.includes("app.companycam.com"));
  // Nothing in this app calls localhost, so declaring it would widen egress for
  // no reason.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.alt, "CompanyCam");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});

Deno.test("index: the icon is the vendor's own file, byte-for-byte", async () => {
  // Downloaded verbatim on 2026-08-11 from https://companycam.com/apple-touch-icon.png,
  // md5 411d86ab3dd3b5efe6d879ea59c5d31b, 7,213 bytes, a 76x76 RGBA PNG. The
  // identical bytes are served from assets.c.companycam.com, which is the
  // corroboration that it is the vendor's mark and not a CDN placeholder.
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(bytes.length, 7213, "icon.png is no longer the 7,213-byte vendor file");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  assertEquals(
    hex,
    "28a893c26f47dce1ddcea12e8b8780d332e7161d5539bbb9fa996a12f778d09e",
    "icon.png is not the file downloaded from companycam.com — it was replaced or re-encoded",
  );
  // PNG magic. The digest above is the real assertion; this only makes a
  // wrong-format file fail with a readable message.
  assertEquals(Array.from(bytes.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// access-token\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
