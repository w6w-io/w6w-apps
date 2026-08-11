import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { SITES } from "../lib/sites.ts";
import { STATUS_ALLOW, STATUS_HOSTS } from "../health/service.ts";

const ACTION_COUNT = 22;

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
 * Datadog offers no idempotency key anywhere in this surface. A retried metric
 * submission adds to a count; a retried event posts twice; a retried downtime
 * schedules a second overlapping window with its own UUID that cancelling the
 * first will not touch. Marking any of these `true` would let the runtime do
 * that on a dropped connection.
 */
Deno.test("index: no action that creates something is marked idempotent", () => {
  for (const key of ["metric-submit", "event-post", "downtime-schedule"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: cancelling an
 * already-cancelled downtime changes nothing, so saying so is what lets the
 * runtime recover the un-mute step from a dropped connection instead of leaving
 * production silenced.
 */
Deno.test("index: cancelling a downtime is marked idempotent", () => {
  assertEquals(app.actions.find((a) => a.key === "downtime-cancel")?.idempotent, true);
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

/**
 * The credential guard is written against what a leak would actually look like —
 * the two header names and the `credential` binding — rather than against the
 * phrase "API key", which legitimately appears in the prose of an action whose
 * whole job is validating one.
 */
Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets an auth header itself`);
    assert(!/dd-api-key/i.test(src), `${a.key}: stamps DD-API-KEY`);
    assert(!/dd-application-key/i.test(src), `${a.key}: stamps DD-APPLICATION-KEY`);
    assert(!/\bapi_key=|\bapplication_key=/i.test(src), `${a.key}: uses the deprecated query auth`);
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
 * The origin lives in `lib/sites.ts` and nowhere else. With nine hostnames in
 * play, an action that hard-coded one would quietly send an EU1 connection's
 * request to US1 — where its keys do not exist, producing a 403 that reads like
 * a revoked credential.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/datadoghq|ddog-gov/i.test(src), `${a.key}: contains a Datadog host literal`);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

/**
 * Connection identity — which Datadog, and with which keys — must never be an
 * Action param: it belongs to the Connection, and a param would let one step
 * address a site the manifest reasoned about differently.
 *
 * `host` is deliberately **not** on this list. In Datadog it is a domain noun —
 * the monitored machine a datapoint or event belongs to — and it appears as a
 * legitimate data field on three actions. What actually protects the origin is
 * structural and asserted separately: `DatadogClient` builds every URL as
 * `apiBase(connection.site) + <literal path>`, and no action file may contain an
 * absolute URL or a Datadog host literal (the test above). A `host` param cannot
 * reach the origin under those two facts, so banning the word would be
 * superstition rather than a guarantee.
 */
Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(site|api_?host|origin|domain|base_?url|api_?key|app_?key|token|org)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/**
 * The other half of that argument, asserted rather than asserted-about: every
 * `host` param in the app is sent as data (a query value or a body field) and
 * none of them is used to build a URL. Derived from the sources, so a new one
 * has to justify itself here.
 */
Deno.test("index: every `host` param is data, never part of a request path", async () => {
  const withHost: string[] = [];
  for (const a of app.actions) {
    if (!(a.params ?? []).some((p) => p.key === "host")) continue;
    withHost.push(a.key);
    // Every path this app builds is a literal starting with `/api/`. Collect the
    // `${…}` interpolations inside those literals and require that none of them
    // mentions a host.
    for (const m of (await actionSource(a.key)).matchAll(/`(\/[^`]*)`/g)) {
      for (const slot of m[1].matchAll(/\$\{([^}]*)\}/g)) {
        assert(!/\bhost\b/i.test(slot[1]), `${a.key}: a host is interpolated into a path`);
      }
    }
  }
  // A derivation that found nothing would pass vacuously.
  assertEquals(
    withHost.sort(),
    ["event-post", "metric-list", "metric-submit"],
    "the set of actions taking a `host` param changed",
  );
});

// --- the endpoint surface, derived rather than hand-listed --------------------

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

Deno.test("index: the request-path derivation actually finds paths", async () => {
  assert(
    requestPaths(await actionSource("dashboard-get")).includes("/api/v1/dashboard/{}"),
    "requestPaths no longer recognises a template-literal path — the guards below are blind",
  );
  assertEquals(requestPaths('const p = "/api/v1/validate";'), ["/api/v1/validate"]);
  assertEquals(requestPaths("const p = `/api/v2/downtime/${id}`;"), ["/api/v2/downtime/{}"]);
});

/**
 * Endpoints that return live key material. None is reachable from this app, and
 * the set is checked against every action's derived path list rather than a
 * memory of which files were written.
 *
 * `GET /api/v1/api_key`, `GET /api/v1/application_key` and
 * `GET /api/v2/current_user/application_keys` all return the key itself.
 * Mailjet's `/apikey` and Follow Up Boss's `/me` are the same trap, already
 * banned pack-wide.
 */
const KEY_BEARING_PATHS = [
  "/api/v1/api_key",
  "/api/v1/application_key",
  "/api/v2/current_user/application_keys",
  "/api/v2/api_keys",
  "/api/v2/application_keys",
];

Deno.test("index: no action, auth hook or health check touches a key-returning endpoint", async () => {
  const files: string[] = [];
  for (const a of app.actions) files.push(await actionSource(a.key));
  for (const dir of ["auth", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      files.push(
        code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
      );
    }
  }
  assert(files.length > 25, `expected the whole source tree, scanned ${files.length} files`);
  for (const src of files) {
    for (const banned of KEY_BEARING_PATHS) {
      assert(!src.includes(banned), `a source file reaches ${banned}, which returns key material`);
    }
  }
});

/**
 * The two v2 endpoints that live on an intake host rather than `api.<site>`.
 * Neither host is in `network.allow`, so calling either would be blocked egress
 * at runtime; catching it here says *why* instead.
 */
Deno.test("index: no action calls a v2 endpoint that lives on an intake host", async () => {
  for (const a of app.actions) {
    const paths = requestPaths(await actionSource(a.key));
    assert(
      !paths.includes("/api/v2/logs"),
      `${a.key}: POST /api/v2/logs is on http-intake.logs.<site>, not api.<site>`,
    );
    // `POST` only: `GET /api/v2/events` (search) is on api.<site> and is used.
    const src = await actionSource(a.key);
    assert(
      !/"\/api\/v2\/events"[\s\S]{0,200}method:\s*"POST"/.test(src),
      `${a.key}: POST /api/v2/events is on event-management-intake.<site>, not api.<site>`,
    );
  }
});

// --- auth --------------------------------------------------------------------

Deno.test("index: the credential fields are declared secret and the site is not", () => {
  const [method] = app.auth;
  assertEquals(method.key, "api-key");
  assertEquals(method.type, "custom");
  const fields = Object.fromEntries((method.fields ?? []).map((f) => [f.key, f]));
  assertEquals(fields.apiKey.type, "secret");
  assertEquals(fields.appKey.type, "secret");
  assertEquals(fields.apiKey.required, true);
  // The application key is deliberately optional: an API key alone is enough to
  // submit metrics and events, and demanding both would lock that user out.
  assertEquals(fields.appKey.required, undefined);
  assertEquals(fields.site.type, "select");
  assertEquals(fields.site.required, true);
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

/**
 * The auth probes are pinned by path. Choosing them is the step where a
 * credential most easily leaks back out, so a swap has to be deliberate.
 */
Deno.test("index: the auth probes are /api/v1/validate and /api/v2/current_user", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('"/api/v1/validate"'), "the API-key probe moved off /api/v1/validate");
  assert(
    src.includes('"/api/v2/current_user"'),
    "the app-key probe moved off /api/v2/current_user",
  );
});

// --- health ------------------------------------------------------------------

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

/** A check that widens egress must be unsigned — a status host never sees a key. */
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

// --- manifest ----------------------------------------------------------------

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { svg: string } };
    categories: string[];
  };
};

Deno.test("index: the manifest allows exactly the nine api hosts and no status host", () => {
  assertEquals(manifest.w6w.id, "io.w6w.datadog");
  const allow = manifest.w6w.network.allow;

  // Derived from the site table rather than restated, so adding a site to
  // `lib/sites.ts` without allowlisting it fails here rather than at runtime.
  assertEquals(
    allow.slice().sort(),
    SITES.map((s) => s.apiHost).sort(),
    "network.allow and the site table disagree",
  );
  assertEquals(allow.length, 9);

  // Status hosts belong to the service check's own allowlist, not the app's.
  for (const host of STATUS_ALLOW) {
    assert(!allow.includes(host), `${host} must not be in the app's egress list`);
  }
  // Neither intake host is called, so neither is allowlisted.
  for (const host of allow) {
    assert(!host.startsWith("http-intake."), "log intake host must not be allowlisted");
    assert(
      !host.startsWith("event-management-intake."),
      "event intake host must not be allowlisted",
    );
  }
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the site table and the status host table cover the same nine sites", () => {
  assertEquals(SITES.length, 9);
  assertEquals(Object.keys(STATUS_HOSTS).sort(), SITES.map((s) => s.id).sort());
  // Eight status pages exist; UK1's does not, and that absence is declared
  // rather than left as a hole.
  assertEquals(STATUS_ALLOW.length, 8);
  assertEquals(STATUS_HOSTS.uk1, undefined);
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from simple-icons on 2026-08-11: 2,998 bytes.
  assertEquals(svg.length, 2998, "icon.svg is no longer the 2,998-byte vendor file");
  assert(svg.includes("<title>Datadog</title>"), "the mark no longer names Datadog");
  assert(svg.includes('viewBox="0 0 24 24"'));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// dd-api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
