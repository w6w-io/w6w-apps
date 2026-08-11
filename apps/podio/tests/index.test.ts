import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 29;

Deno.test("index: exports actions, both auth methods and three health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 2);
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
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(performs.length, 10, "the perform set changed — re-read the idempotency split");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Podio accepts no idempotency key on any create, and does not deduplicate on
 * `external_id` — it says so itself for items. The runtime may retry an action
 * marked idempotent, so marking any of these `true` would turn one transient
 * network error into a duplicate record a human has to find and delete.
 */
Deno.test("index: no creating action is marked idempotent", () => {
  for (const key of ["item-create", "comment-add", "task-create", "hook-create"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these seven
 * genuinely converge on the same end state, and saying so is what lets the
 * runtime recover from a dropped connection instead of failing the run.
 */
Deno.test("index: exactly the convergent performs are marked idempotent", () => {
  const idempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent === true)
    .map((a) => a.key)
    .sort();
  assertEquals(idempotent, [
    "file-attach",
    "hook-delete",
    "hook-verify-request",
    "item-delete",
    "item-update",
    "task-complete",
  ]);
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
    assert(!/\boauth2\s+\$/i.test(src), `${a.key}: builds Podio's OAuth2 scheme`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
    assert(!/app[_-]?token/i.test(src), `${a.key}: touches the app token`);
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
    assert(!/podio\.com/.test(src), `${a.key}: contains a Podio host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|client_?id)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the redaction invariant, derived rather than listed ---------------------

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
 * The HTTP method an action's single request uses, read off its source.
 *
 * Every action here makes exactly one request, which is what makes a
 * source-derived method sound; the test below asserts that property rather than
 * assuming it. `PodioClient` defaults to GET when no `method` is given.
 */
function requestMethod(src: string): string {
  const matches = [...src.matchAll(/\bmethod:\s*"([A-Z]+)"/g)].map((m) => m[1]);
  if (matches.length === 0) return "GET";
  if (matches.length > 1) throw new Error(`more than one method literal: ${matches.join(", ")}`);
  return matches[0];
}

/**
 * The REQUESTS whose responses carry credential-grade material, read off
 * Podio's own documented response schemas. Keyed by method as well as path,
 * because the two are not interchangeable on the same URL:
 *
 *  - `GET /app/{}` returns `token`, "The app token to use when logging in as an
 *    app" — the credential half of the App Authentication grant.
 *  - `GET /item/{}`, `GET /task/{}` and `GET /file/{}` return
 *    `push: {channel, signature, timestamp}`, a signed subscription grant for
 *    that object's event stream.
 *  - `GET /app/space/{}/` and `POST /item/app/{}/filter/` return lists of those
 *    same entity kinds.
 *  - `GET /item/app/{}/external_id/{}` returns one item.
 *
 * `PUT /item/{}` and `DELETE /item/{}` share a path with the first of these and
 * are deliberately absent: Podio documents their responses as `{revision,
 * title}` and empty respectively — neither is an entity, so neither has
 * anything to strip. Keying on the path alone conflated them, which is how a
 * decorative `stripSecrets` call gets added to satisfy a rule rather than a
 * risk.
 */
const SECRET_BEARING_REQUESTS = new Set([
  "GET /app/{}",
  "GET /app/space/{}/",
  "GET /item/{}",
  "POST /item/app/{}/filter/",
  "GET /item/app/{}/external_id/{}",
  "GET /task/{}",
  "GET /file/{}",
]);

/**
 * The invariant, both ways: an action making a secret-bearing request MUST
 * strip, and an action that strips MUST have a reason to. The second half is
 * what stops the rule decaying into a decorative call nobody can justify.
 *
 * Because the candidate set is derived from every action's own source, adding
 * `GET /app/{id}` in a new file without stripping fails here rather than
 * shipping.
 */
Deno.test("index: exactly the actions making a secret-bearing request strip secrets", async () => {
  const touching: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    const method = requestMethod(src);
    if (requestPaths(src).some((p) => SECRET_BEARING_REQUESTS.has(`${method} ${p}`))) {
      touching.push(a.key);
    }
    // `summarizeApp` and `summarizeAppFields` both run the strip; naming all
    // four keeps the projection helpers from looking like an exemption.
    if (/\b(stripSecrets|stripSecretsAll|summarizeApp|summarizeAppFields)\s*\(/.test(src)) {
      stripping.push(a.key);
    }
  }
  assertEquals(
    touching.slice().sort(),
    stripping.slice().sort(),
    `actions making a secret-bearing request: ${touching.sort().join(", ")} · ` +
      `actions stripping: ${stripping.sort().join(", ")}`,
  );
  // A derivation that found nothing would pass vacuously and prove nothing.
  assertEquals(touching.length, 8, `expected 8 secret-bearing actions, found ${touching.length}`);
});

/**
 * The soundness condition the derivation above rests on: one request per
 * action, so one method literal per source file. An action that grew a second
 * call would silently pair the wrong method with the wrong path.
 */
Deno.test("index: every action makes exactly one request, so method and path pair unambiguously", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    // Throws if a file carries more than one `method:` literal.
    const method = requestMethod(src);
    assert(
      ["GET", "POST", "PUT", "DELETE"].includes(method),
      `${a.key}: unexpected method ${method}`,
    );
    const clientCalls = [...src.matchAll(/new PodioClient\(ctx\)\.(json|status)\b/g)];
    assertEquals(clientCalls.length, 1, `${a.key}: makes ${clientCalls.length} client calls`);
  }
});

Deno.test("index: the request derivation actually finds paths and methods", async () => {
  const src = await actionSource("app-get");
  assert(
    requestPaths(src).includes("/app/{}"),
    "requestPaths no longer recognises a template-literal path — the invariant above is blind",
  );
  assertEquals(requestMethod(src), "GET");
  assertEquals(requestMethod(await actionSource("item-update")), "PUT");
  assertEquals(requestMethod(await actionSource("item-delete")), "DELETE");
  assertEquals(requestMethod(await actionSource("item-filter")), "POST");
  assertEquals(requestPaths('const p = "/org/";'), ["/org/"]);
  assertEquals(requestPaths("const p = `/item/${id}/value`;"), ["/item/{}/value"]);
});

/**
 * The strongest form of the app-token guard: run the two actions that read
 * `GET /app/{id}` against a response carrying the token, and assert it is
 * nowhere in the serialized result. A path-based rule can be satisfied by a
 * decorative call; this cannot.
 */
Deno.test("index: the app token cannot survive either action that reads an app", async () => {
  const { mockCtx } = await import("./_helpers.ts");
  const APP_BODY = {
    app_id: 1,
    token: "APP-TOKEN-SENTINEL",
    push: { signature: "PUSH-SIGNATURE-SENTINEL" },
    fields: [{ field_id: 1, type: "text", external_id: "t", config: { label: "T" } }],
  };
  for (const key of ["app-get", "app-fields-list"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const { ctx } = mockCtx([{ body: APP_BODY }]);
    const out = await (action.execute as (i: unknown, c: unknown) => Promise<unknown>)(
      { appId: "1" },
      ctx,
    );
    const serialized = JSON.stringify(out);
    assert(!serialized.includes("APP-TOKEN-SENTINEL"), `${key}: the app token survived`);
    assert(!serialized.includes("PUSH-SIGNATURE-SENTINEL"), `${key}: the push signature survived`);
  }
});

// --- auth ------------------------------------------------------------------

const authSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../auth/${key}.ts`, import.meta.url)));

Deno.test("index: both auth methods exist, with the app grant first", () => {
  assertEquals(app.auth.map((m) => m.key), ["app-auth", "oauth2"]);
  assertEquals(app.auth.map((m) => m.type), ["custom", "oauth2"]);
  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
  }
});

Deno.test("index: every collected credential field is declared secret", () => {
  for (const method of app.auth) {
    for (const f of method.fields ?? []) {
      if (f.key === "appId") continue; // an identifier, not a credential
      assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not "secret"`);
    }
  }
});

/**
 * The probe is pinned by path. Choosing it is the step where a credential most
 * easily leaks back out: Podio's obvious whoami, `GET /user/status`, returns
 * `calendar_code` — the secret in the account's iCal feed URL — and is
 * unreachable under App Authentication besides. `/oauth/scope` requires a
 * credential, works for both token kinds, is itself unscoped, and returns
 * nothing secret. If someone swaps it, this makes them do it deliberately.
 */
Deno.test("index: the auth probe is /oauth/scope in both methods", async () => {
  const src = await authSource("app-auth");
  assert(src.includes('PROBE_PATH = "/oauth/scope"'), "the shared probe moved");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/user/.test(src),
    "the probe was pointed at a /user endpoint, which an app token cannot reach",
  );
});

/**
 * `/user/status` returns `calendar_code`. Nothing in the auth or health layer
 * may read it *signed* — the unsigned reachability probe in `health/api.ts` is
 * the one legitimate use, and it is unsigned precisely so no credential is
 * present to produce that field.
 */
Deno.test("index: nothing signed reads /user/status, which returns the iCal feed secret", async () => {
  for (const dir of ["auth", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      if (!/["'`]\/user\/status["'`]/.test(src)) continue;
      assert(
        entry.name === "api.ts" && dir === "health",
        `${dir}/${entry.name}: reads /user/status outside the unsigned reachability probe`,
      );
      const check = app.healthChecks.find((h) => h.key === "api")!;
      assertEquals(check.credential, "none", "the /user/status probe is no longer unsigned");
    }
  }
});

/**
 * The token endpoint choice is load-bearing and invisible: `/oauth/token/v2`
 * accepts only a JSON body, and the host's generic OAuth exchange posts
 * form-encoded. Pointing at it fails with "must be object", which reads like a
 * bad request rather than a wrong content type.
 */
Deno.test("index: both methods use the form-encoded token endpoint, not the JSON-only /v2", async () => {
  const src = await authSource("app-auth");
  assert(src.includes("TOKEN_URL = `${API_BASE}/oauth/token`"), "the token URL moved");
  assert(!/\/oauth\/token\/v2/.test(src), "an action path points at the JSON-only endpoint");
  assertEquals(app.auth[1].oauth2!.tokenUrl, "https://api.podio.com/oauth/token");
});

/** Podio implements OAuth2 draft-10, which predates PKCE by five years. */
Deno.test("index: the OAuth method turns PKCE off explicitly", () => {
  assertEquals(app.auth[1].oauth2!.pkce, false);
});

/**
 * Podio documents a username-and-password grant. It is a resource-owner-password
 * flow — the pattern OAuth 2.1 removes — and offering it would mean storing a
 * person's actual Podio password in a Connection, where an app token that can be
 * regenerated already exists.
 */
Deno.test("index: the password grant is not offered, in any form", async () => {
  for (const key of ["app-auth", "oauth2"]) {
    const src = await authSource(key);
    assert(!/grant_type["']?\s*:\s*["']password/.test(src), `${key}: builds a password grant`);
  }
  for (const method of app.auth) {
    for (const f of method.fields ?? []) {
      assert(!/^(username|password)$/i.test(f.key), `${method.key}: collects ${f.key}`);
    }
  }
});

// --- health ----------------------------------------------------------------

Deno.test("index: the health surface is exactly service, api and quota", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
  assertEquals(app.healthChecks.map((h) => h.kind), ["service", "dependency", "quota"]);
});

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
 * the App at `unknown` forever. Podio publishes enough for all three checks to
 * be live, so the set is empty today — the rule is asserted over whatever the
 * set contains so that adding one later cannot skip it.
 */
Deno.test("index: any declared absence is informational, and today there are none", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
  assertEquals(
    unavailable.map((h) => h.key),
    [],
    "a check became a declared absence — confirm it is informational and update this list",
  );
});

/** A check that widens egress must be unsigned — a status host never sees a token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assertEquals(widening.map((h) => h.key), ["service"], "the widening set changed");
  for (const h of widening) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/**
 * The unsigned reachability probe must stay unsigned, and the signed quota
 * probe must stay on the app's own host. Swapping either would either put a
 * credential on an unverified surface or make an outage look like an auth
 * failure.
 */
Deno.test("index: the api probe is unsigned and the quota probe is signed with no extra egress", () => {
  const api = app.healthChecks.find((h) => h.key === "api")!;
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);

  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.podio");
  assertEquals(manifest.w6w.network.allow, ["api.podio.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.podio.com"));
  // The authorize host is implicit from the OAuth config and must not be
  // restated as general app egress.
  assert(!manifest.w6w.network.allow.includes("podio.com"));
  // 127.0.0.1 has no place in a shipped manifest — it grants the sandbox a
  // route to whatever else is listening on the host.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  assertEquals(manifest.w6w.appearance.icon.alt, "Podio");
  assertEquals(manifest.w6w.categories.length, 3);
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from podio.com/favicon.svg on 2026-08-11: 566 bytes,
  // image/svg+xml, a single path in Podio's green on a 25x27 viewBox.
  assertEquals(svg.length, 566, "icon.svg is no longer the 566-byte vendor file");
  assert(svg.includes('viewBox="0 0 25 27"'));
  assert(svg.includes('fill="#5CE500"'), "the vendor's green is gone — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
