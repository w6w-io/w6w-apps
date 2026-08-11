import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 18;

Deno.test("index: exports actions, auth and health checks", () => {
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
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * TidyCal accepts no idempotency key on any operation, so a retry of any of
 * these re-runs the side effect: a second booking type, a second booking (or a
 * 409 for a slot the first attempt took), a duplicate contact, or a second
 * invitation email. Marking any of them `true` would let the runtime do that on
 * a dropped connection.
 */
Deno.test("index: no creating action is marked idempotent", () => {
  for (
    const key of [
      "booking-type-create",
      "booking-create",
      "contact-create",
      "team-user-add",
      "team-booking-type-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: cancelling a
 * booking and removing a team member both converge — a retry finds the work
 * already done and TidyCal says so (400 "already cancelled", 422 "user not found
 * in team") rather than doing it twice.
 */
Deno.test("index: the two converging performs are marked idempotent", () => {
  for (const key of ["booking-cancel", "team-user-remove"]) {
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
    assert(!/\btokens?\b/i.test(src), `${a.key}: touches a token`);
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
 * the manifest never allowlisted. This matters more here than usual: the API
 * shares `tidycal.com` with the public site, so a stray absolute URL would look
 * plausible while hitting the marketing router.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/tidycal\.com/.test(src), `${a.key}: contains a TidyCal host literal`);
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

// --- the surface invariant, derived rather than spot-checked -----------------

/**
 * Every request the action layer builds, as `METHOD /path` with `${…}`
 * interpolations collapsed to `{}` — derived from each action's own source, so a
 * new or renamed endpoint is covered the moment it is written.
 */
function requestsOf(src: string): string[] {
  const method = /method:\s*"([A-Z]+)"/.exec(src)?.[1] ?? "GET";
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(`${method} ${literal.replace(/\$\{[^}]*\}/g, "{}")}`);
  }
  return out;
}

/**
 * The eighteen operations TidyCal's OpenAPI 3.0.0 document declares, transcribed
 * from its `paths` object (extracted from the `__redoc_state` blob of
 * `tidycal.com/developer/docs/`, 2026-08-11) and each confirmed live by the
 * `Allow` header its own router returns for a wrong verb.
 *
 * This is the closed set. `GET /booking-types/{id}/bookings` exists on the wire
 * but is undocumented and deliberately absent, and `GET /booking-types/{id}` and
 * `GET /contacts/{id}` do not exist at all.
 */
const DOCUMENTED_OPERATIONS = [
  "GET /bookings",
  "GET /bookings/{}",
  "PATCH /bookings/{}/cancel",
  "GET /booking-types",
  "POST /booking-types",
  "GET /booking-types/{}/timeslots",
  "POST /booking-types/{}/bookings",
  "GET /contacts",
  "POST /contacts",
  "GET /me",
  "GET /teams",
  "GET /teams/{}",
  "GET /teams/{}/bookings",
  "GET /teams/{}/users",
  "POST /teams/{}/users",
  "DELETE /teams/{}/users/{}",
  "GET /teams/{}/booking-types",
  "POST /teams/{}/booking-types",
];

/**
 * The invariant, both ways: the actions cover every documented operation, and
 * they reach nothing else. One action per operation, so any drift — a typo'd
 * path, a verb changed to the one TidyCal answers 405 for, an endpoint invented
 * from a sibling app — shows up as a set difference rather than as a runtime
 * 404 nobody sees until a workflow runs.
 */
Deno.test("index: the actions cover exactly the documented operations, one each", async () => {
  const built: string[] = [];
  for (const a of app.actions) {
    const requests = requestsOf(await actionSource(a.key));
    assertEquals(
      requests.length,
      1,
      `${a.key}: expected exactly one request path, got ${requests}`,
    );
    built.push(requests[0]);
  }
  assertEquals(built.length, ACTION_COUNT);
  assertEquals(
    built.slice().sort(),
    DOCUMENTED_OPERATIONS.slice().sort(),
    "the action surface has drifted from TidyCal's documented operations",
  );
});

Deno.test("index: the request derivation actually finds paths and verbs", () => {
  assertEquals(requestsOf('const p = "/me";'), ["GET /me"]);
  assertEquals(
    requestsOf('method: "PATCH",\nconst p = `/bookings/${id}/cancel`;'),
    ["PATCH /bookings/{}/cancel"],
  );
  // A derivation that silently found nothing would make the invariant vacuous.
  assertEquals(requestsOf("const p = 1;"), []);
});

// --- auth ------------------------------------------------------------------

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out. It is
 * `/me` here only because TidyCal's `User` schema carries no credential — seven
 * properties, all identity. The collections that would otherwise do the job
 * carry a payment-platform UUID (`BookingType`) or third parties' emails, phone
 * numbers and IP addresses (`Contact`). If someone swaps it, this makes them do
 * it deliberately.
 */
Deno.test("index: both auth methods probe /me and nothing else", async () => {
  for (const file of ["personal-token", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${file}.ts`, import.meta.url)));
    assert(src.includes("PROBE_PATH"), `auth/${file}.ts: does not use the shared probe path`);
    for (const banned of ["/contacts", "/booking-types", "/bookings"]) {
      assert(
        !new RegExp(`["'\`]${banned}`).test(src),
        `auth/${file}.ts: probes ${banned}, which carries data a probe must not store`,
      );
    }
  }
  const personal = await import("../auth/personal-token.ts");
  assertEquals(personal.PROBE_PATH, "/me");
});

Deno.test("index: the credential field is declared secret and sign is present", () => {
  const [personal, oauth] = app.auth;

  assertEquals(personal.key, "personal-token");
  assertEquals(personal.type, "bearer");
  assert((personal.fields ?? []).length > 0, "the bearer method collects no field");
  for (const f of personal.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }

  assertEquals(oauth.key, "oauth2");
  assertEquals(oauth.type, "oauth2");
  // A user-facing field on an OAuth method would mean the app was asking the
  // user for something the authorization flow is supposed to supply.
  assertEquals(oauth.fields ?? [], []);

  for (const m of app.auth) {
    assertEquals(typeof m.test, "function", `${m.key}: no test hook`);
    assertEquals(typeof m.sign, "function", `${m.key}: no sign hook`);
  }
});

/**
 * The OAuth endpoints are TidyCal's own, verbatim from its reference, and both
 * were confirmed live. `scopes` and `pkce` are deliberately absent: TidyCal
 * documents no scope vocabulary for a REST client (its only published scope,
 * `mcp:scheduling:read`, belongs to the separate MCP connector) and does not say
 * whether its clients are public.
 */
Deno.test("index: the OAuth config names TidyCal's documented endpoints only", () => {
  const oauth = app.auth.find((m) => m.key === "oauth2")!;
  assertEquals(oauth.oauth2?.authorizationUrl, "https://tidycal.com/oauth/authorize");
  assertEquals(oauth.oauth2?.tokenUrl, "https://tidycal.com/oauth/token");
  assertEquals(oauth.oauth2?.refreshUrl, "https://tidycal.com/oauth/token");
  assertEquals(oauth.oauth2?.scopes, undefined, "a scope was invented");
  assertEquals(oauth.oauth2?.pkce, undefined, "PKCE was assumed rather than verified");
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
 * the App at `unknown` forever. Both of TidyCal's absences are real: it
 * publishes no status page and no rate-limit signal.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assertEquals(unavailable.length, 2, "expected the service and quota absences");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/**
 * The one live check must not spend the credential it is monitoring, and must
 * not widen egress. TidyCal has nothing to widen to — the API and the site share
 * one host — so an empty `network.allow` is the correct answer, not an omission.
 */
Deno.test("index: the api check is unsigned and widens no egress", () => {
  const check = app.healthChecks.find((h) => h.key === "api")!;
  assertEquals(check.credential, "none");
  assertEquals(check.scope, "app");
  assertEquals(check.kind, "dependency");
  assertEquals(check.network, undefined, "the api check widens egress");
  for (const h of app.healthChecks) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows exactly the one host the app calls", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { svg: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.tidycal");
  // One entry, and it is the API host. `api.tidycal.com` is NXDOMAIN and there
  // is no status host to allow — see health/service.ts.
  assertEquals(manifest.w6w.network.allow, ["tidycal.com"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

/**
 * No loopback, no wildcard, no placeholder. A `127.0.0.1` in a published app's
 * allowlist is a copy-paste from a starter template, not a host the app calls.
 */
Deno.test("index: the egress allowlist contains no loopback or wildcard", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  for (const host of manifest.w6w.network.allow) {
    assert(!/^127\.|localhost|^0\.0\.0\.0$|^\[?::1\]?$/.test(host), `loopback allowed: ${host}`);
    assert(!host.includes("*"), `wildcard allowed: ${host}`);
  }
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from https://tidycal.com/img/logo-icon.svg on
  // 2026-08-11: 2,029 bytes, md5 854fc2bca908c95fd52bc3ba228990ad, one path in
  // TidyCal's single brand blue. Nothing here was drawn by hand.
  assertEquals(svg.length, 2029, "icon.svg is no longer the 2,029-byte vendor file");
  assert(svg.includes('viewBox="0 0 74.9000015 70.8149261"'), "the vendor viewBox changed");
  assert(svg.includes("#1569ef"), "the vendor brand colour is gone — the mark was redrawn");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// bearer token\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
