import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 35;

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
 * No endpoint in this app's surface documents an idempotency key (the only
 * exception in the wider Dialpad API, per the vendor's own docs, is
 * `message/schedule` — out of scope here), so every action that creates or
 * mutates a distinct resource on each call is `false`.
 */
Deno.test("index: no create/ring/transfer/send action is marked idempotent", () => {
  for (
    const key of [
      "call-initiate",
      "call-transfer",
      "sms-send",
      "users-create",
      "contacts-create",
      "callrouters-create",
      "rooms-create",
      "webhooks-create",
      "call-event-subscription-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse: every delete, and every PATCH that replaces the fields it
 * names wholesale, ends in the same state no matter how many times it runs.
 */
Deno.test("index: every delete and every full-replace PATCH is marked idempotent", () => {
  for (
    const key of [
      "users-update",
      "users-delete",
      "contacts-update",
      "contacts-delete",
      "callrouters-update",
      "callrouters-delete",
      "rooms-update",
      "rooms-delete",
      "webhooks-update",
      "webhooks-delete",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
});

/**
 * `call-hangup` is the one deliberately conservative case: no documented
 * "already ended" success path, so it is NOT declared idempotent even though
 * it is also a candidate for the converse list above. Pinned here so the
 * choice reads as deliberate rather than an omission.
 */
Deno.test("index: call-hangup is conservatively non-idempotent", () => {
  assertEquals(app.actions.find((a) => a.key === "call-hangup")?.idempotent, false);
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
 * Strip comments so the sandbox guards below scan CODE, not prose — the
 * module docs on the webhook/call-router actions talk about secrets and
 * credentials at length precisely because they must NOT touch one.
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
    assert(!/dialpad\.com/.test(src), `${a.key}: contains a Dialpad host literal`);
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
 * The paths whose responses carry a live signing secret: any webhook or API
 * call router endpoint, and `subscriptions/call`, whose responses embed a full
 * webhook object. Read off the vendor's own OpenAPI schemas
 * (`WebhookProto.signature`, `ApiCallRouterProto.signature`,
 * `CallEventSubscriptionProto.webhook.signature`) — see `lib/client.ts`.
 */
const SECRET_BEARING_PATHS = new Set([
  "/webhooks",
  "/webhooks/{}",
  "/callrouters",
  "/callrouters/{}",
  "/subscriptions/call",
]);

/**
 * Does the action's source ever parse a JSON body back from the API? Proxy for
 * "this action receives an entity that could carry a secret" — `.status(...)`
 * (used only by `callrouters-delete`, whose 200 response has no body per the
 * vendor's own OpenAPI document) never does.
 */
function usesJsonBody(src: string): boolean {
  return /\.json[<(]/.test(src);
}

/**
 * The invariant, both ways: an action that touches a secret-bearing path AND
 * reads a JSON body back MUST strip, and an action that strips MUST have a
 * reason to. Because the candidate set is derived from every action's own
 * source, adding `GET /api/v2/webhooks/{id}` in a new file without
 * `stripSignatureSecret` fails here rather than shipping.
 */
Deno.test("index: exactly the actions touching a secret-bearing path strip the signing secret", async () => {
  const touching: string[] = [];
  const stripping: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (requestPaths(src).some((p) => SECRET_BEARING_PATHS.has(p)) && usesJsonBody(src)) {
      touching.push(a.key);
    }
    if (/\bstripSignatureSecret(FromPage)?\s*\(/.test(src)) stripping.push(a.key);
  }
  assertEquals(
    touching.slice().sort(),
    stripping.slice().sort(),
    `actions touching a secret-bearing path: ${touching.sort().join(", ")} · ` +
      `actions stripping: ${stripping.sort().join(", ")}`,
  );
  // callrouters-{list,get,create,update}, webhooks-{list,create,get,update,delete},
  // call-event-subscription-{list,create}. callrouters-delete is EXCLUDED by
  // usesJsonBody, not by name — see the dedicated test below.
  assertEquals(touching.length, 11, `expected 11 secret-bearing actions, found ${touching.length}`);
});

Deno.test("index: callrouters-delete touches a secret-bearing path but has no body to strip", async () => {
  const src = await actionSource("callrouters-delete");
  assert(requestPaths(src).includes("/callrouters/{}"));
  assert(!/\bstripSignatureSecret\s*\(/.test(src));
  assert(/\.status\s*\(/.test(src), "callrouters-delete should use the status-only client method");
});

Deno.test("index: the request-path derivation actually finds paths", async () => {
  const src = await actionSource("webhooks-get");
  assert(
    requestPaths(src).includes("/webhooks/{}"),
    "requestPaths no longer recognises a template-literal path — the invariant above is blind",
  );
  assertEquals(requestPaths('const p = "/company";'), ["/company"]);
  assertEquals(requestPaths("const p = `/users/${id}`;"), ["/users/{}"]);
});

// --- auth --------------------------------------------------------------------

/**
 * The auth probe is pinned by path. `GET /api/v2/company` is the obvious
 * alternative and is wrong: the spec tags it `x-access: admin`, so a
 * perfectly good user-level key would fail it.
 */
Deno.test("index: the auth probe is /offices, not the admin-only /company", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('"/offices"'), "auth probe no longer hits /offices");
  assert(
    !/PROBE_PATH\s*=\s*["'`]\/company["'`]/.test(src),
    "the probe was pointed at the admin-only /company endpoint",
  );
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
 * pins the App at `unknown` forever.
 */
Deno.test("index: every unavailable health check is informational", () => {
  const unavailable = app.healthChecks.filter((h) => h.unavailable);
  assert(unavailable.length > 0, "no declared absence — this test would pass vacuously");
  for (const h of unavailable) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the API key. */
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
  assertEquals(manifest.w6w.id, "io.w6w.dialpad");
  assert(manifest.w6w.network.allow.includes("dialpad.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.dialpad.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is a verbatim vendor favicon, wrapped as SVG", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from https://dialpad.com/assets/images/favicons/favicon-192x192.png
  // on 2026-08-29 — the same file dialpad.com's own <link rel="apple-touch-icon"> tag
  // points at — and embedded as a base64 data URI. Dialpad publishes no SVG mark on its
  // own site; this is the pack's precedent for a vendor whose only real asset is a raster
  // favicon (see apollo, blandai, gorgias, kustomer).
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"'),
    "icon.svg is not framed on its own 192x192 canvas",
  );
  assert(svg.includes("data:image/png;base64,"), "icon.svg no longer embeds the vendor PNG");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
