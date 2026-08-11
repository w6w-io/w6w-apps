import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 36;

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

Deno.test("index: every action declares a valid type, a description, an execute hook and outputs", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assert(performs.length > 0, "no perform actions — this test would pass vacuously");
  for (const a of performs) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * Keap accepts no idempotency key of any kind on any endpoint in this app's
 * surface, so every one of these creates or sends something new on each call.
 * Marking one `true` would let the runtime turn a dropped connection into a
 * second contact, a second email or a second billed pipeline entry.
 */
Deno.test("index: no create-or-send action is marked idempotent", () => {
  for (
    const key of [
      "contact-create",
      "contact-note-create",
      "tag-create",
      "company-create",
      "opportunity-create",
      "task-create",
      "email-send",
      "automation-goal-achieve",
      "appointment-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these five
 * genuinely are safe to retry, and saying so is what lets the runtime recover
 * from a dropped connection instead of failing the run.
 */
Deno.test("index: the five genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "contact-update",
      "contact-delete",
      "tag-apply",
      "tag-remove",
      "campaign-sequence-add-contacts",
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

Deno.test("index: every action declares a resource, so the editor can group them", () => {
  for (const a of app.actions) {
    assert(typeof a.resource === "string" && a.resource.length > 0, `${a.key}: no resource`);
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

Deno.test("index: the comment stripper actually strips, so the guards below mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// bearer\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches an API key`);
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
 * the manifest never allowlisted. Keap is SaaS-only with one origin, so there
 * is no legitimate reason for an action to name a host at all.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(
      !/infusionsoft\.com|keap\.com|thryv\.com/.test(src),
      `${a.key}: contains a host literal`,
    );
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL`);
  }
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account|tenant)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the v1/v2 rule, derived rather than asserted by hand --------------------

/**
 * Every API path an action builds, with `${…}` interpolations collapsed to `{}`
 * — derived from the source rather than hand-listed, so a new action is covered
 * the moment it is written.
 */
function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/\$\{V([12])\}([^`"']*)/g)) {
    out.push(`/rest/v${m[1]}${m[2].replace(/\$\{[^}]*\}/g, "{}")}`);
  }
  return out;
}

Deno.test("index: the request-path derivation actually finds paths", () => {
  assertEquals(requestPaths("client.json(`${V2}/contacts`)"), ["/rest/v2/contacts"]);
  assertEquals(
    requestPaths("client.json(`${V2}/contacts/${encodeId(id)}/tags`)"),
    ["/rest/v2/contacts/{}/tags"],
  );
  assertEquals(requestPaths("client.json(`${V1}/appointments`)"), ["/rest/v1/appointments"]);
});

/**
 * The app's stated rule is "v2 unless v2 does not have the resource", and
 * appointments are the single exception because the v2 document has none. This
 * derives the set of v1-touching actions from every action's own source rather
 * than trusting a hand-written list, so a new v1 call has to be justified here
 * before it can ship.
 */
Deno.test("index: exactly the two appointment actions touch v1", async () => {
  const usingV1: string[] = [];
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    if (requestPaths(src).some((p) => p.startsWith("/rest/v1"))) usingV1.push(a.key);
  }
  assertEquals(usingV1.sort(), ["appointment-create", "appointment-list"]);
});

Deno.test("index: every action builds its path through the shared version constants", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(
      requestPaths(src).length > 0,
      `${a.key}: no path built through V1/V2 — it may be constructing a URL another way`,
    );
  }
});

// --- auth -------------------------------------------------------------------

/**
 * The probe is pinned by path.
 *
 * Keap's obvious alternatives are all data reads, and a Personal Access Token
 * "operates under the user context of the user creating it" — so a restricted
 * user's live key would fail a probe against contacts or tags. The identity
 * endpoint is what no permission can withhold. If someone swaps it, this makes
 * them do it deliberately.
 */
Deno.test("index: the auth probe is the identity endpoint, not a data read", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/probe.ts", import.meta.url)));
  assert(src.includes("/oauth/connect/userinfo"), "the probe no longer hits the identity endpoint");
  assert(!/PROBE_PATH[^;]*\/contacts/.test(src), "the probe was pointed at a contact read");
  assert(!/PROBE_PATH[^;]*\/tags/.test(src), "the probe was pointed at a tag read");
});

/**
 * The rule this whole API turns on: Keap answers 401 for four different
 * situations, three of them byte-identical at the status line. A probe that
 * branches on `res.status` alone cannot tell "no credential arrived" from "the
 * credential was rejected".
 */
Deno.test("index: the auth probe branches on the vendor's error code, not the status alone", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/probe.ts", import.meta.url)));
  assert(src.includes("oauth.v2.InvalidAccessToken"), "the no-credential code is not classified");
  assert(
    src.includes("keymanagement.service."),
    "the rejected-credential code is not classified",
  );
});

Deno.test("index: every auth method has a test hook and a sign hook", () => {
  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign`);
    assert(typeof method.displayName === "string" && method.displayName.length > 0);
  }
});

Deno.test("index: every collected credential field is declared secret", () => {
  for (const method of app.auth) {
    for (const f of method.fields ?? []) {
      assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not secret`);
    }
  }
});

/** OAuth carries no user-entered fields; the access key carries exactly one. */
Deno.test("index: the two auth methods collect what each is supposed to", () => {
  const byKey = Object.fromEntries(app.auth.map((m) => [m.key, m]));
  assertEquals(byKey["oauth2"].fields, undefined);
  assertEquals((byKey["access-key"].fields ?? []).map((f) => f.key), ["accessKey"]);
});

// --- health -----------------------------------------------------------------

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

/** A check that widens egress must be unsigned — a status host never sees a Keap token. */
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

/**
 * `status.keap.com` 301-redirects to the APEX of `status.thryv.com`, dropping
 * the path — so every path there answers with the same 1.29 MB HTML. The
 * runtime allowlists the URL it is given, not the redirect target, so naming
 * the Keap host would allowlist a host whose only answer is a web page.
 */
Deno.test("index: no health check names the redirecting status host", async () => {
  for await (const entry of Deno.readDir(new URL("../health", import.meta.url))) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../health/${entry.name}`, import.meta.url)));
    assert(!/status\.keap\.com/.test(src), `health/${entry.name}: names status.keap.com`);
  }
});

// --- manifest ---------------------------------------------------------------

Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: {
      id: string;
      categories: string[];
      network: { allow: string[] };
      appearance: { icon: { url: string; alt: string } };
    };
  };
  assertEquals(manifest.w6w.id, "io.w6w.keap");
  assertEquals(manifest.w6w.network.allow, ["api.infusionsoft.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.thryv.com"));
  // And 127.0.0.1 is not called by anything here, so it is not declared.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.categories.length <= 3, true);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.icon.alt, "Keap");
});

Deno.test("index: the icon is the vendor's mark, byte-for-byte", async () => {
  const bytes = await Deno.readFile(new URL("../assets/icon.png", import.meta.url));
  // Downloaded verbatim from https://keap.com/apple-touch-icon.png on
  // 2026-08-11: 4,222 bytes, 180x180 RGBA PNG, md5 33a0ccad77795f59944838c316d93135.
  assertEquals(bytes.length, 4222, "icon.png is no longer the 4,222-byte vendor file");
  // PNG magic + IHDR width/height (180 x 180), read straight off the header.
  assertEquals(Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  assertEquals(view.getUint32(16), 180);
  assertEquals(view.getUint32(20), 180);
});
