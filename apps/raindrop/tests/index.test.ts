import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 39;

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
 * Raindrop accepts no idempotency key of any kind and does not deduplicate
 * bookmarks on `link` — its duplicate detection is a *report* (Get Filters), not
 * a constraint. The runtime may retry an action marked idempotent, so marking
 * any of these `true` would turn one dropped connection into two bookmarks, two
 * collections, two invitation emails or two queued backups.
 */
Deno.test("index: no create-shaped or email-sending action is marked idempotent", () => {
  for (
    const key of [
      "collection-create",
      "collection-merge",
      "collection-share",
      "raindrop-create",
      "raindrop-create-many",
      "raindrop-update-many",
      "highlight-add",
      "backup-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

/**
 * The converse, and the reason the list above is not just caution: these are
 * partial updates and converging deletes, which really are safe to replay, and
 * saying so is what lets the runtime recover from a dropped connection instead
 * of failing the run.
 */
Deno.test("index: the genuinely-retryable performs are marked idempotent", () => {
  for (
    const key of [
      "collection-update",
      "collection-delete",
      "collection-delete-many",
      "collection-reorder",
      "collection-clean-empty",
      "collection-unshare",
      "collaborator-role-update",
      "collaborator-remove",
      "raindrop-update",
      "raindrop-delete",
      "raindrop-delete-many",
      "highlight-update",
      "highlight-remove",
      "tag-rename",
      "tag-remove",
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
 * Strip user-facing prose — `hint`, `placeholder`, `description`, `label`,
 * `title` — so the URL guard below scans requests rather than examples.
 *
 * Four actions legitimately show an example URL to the user
 * (`https://example.com/article` in a placeholder), and a string in a form
 * definition cannot make a request. This is the same exclusion the pack's own
 * `_tools/audit.ts` applies before deriving an app's real egress host set, so
 * the guard keeps exactly the strength it claims over code.
 */
function stripProse(src: string): string {
  return src.replace(
    /\b(?:hint|description|placeholder|label|title|subtitle):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
}

/**
 * The API origin lives in `lib/client.ts` and nowhere else. An action that
 * hard-coded a host — or accepted one as a param — could be pointed somewhere
 * the manifest never allowlisted.
 *
 * The vendor-host half runs over the RAW source, prose included: no action has
 * any business naming `raindrop.io` even in a comment or a hint, and today none
 * of them does. Only the generic absolute-URL half is scoped to code.
 */
Deno.test("index: no action hard-codes a host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/raindrop\.io/.test(src), `${a.key}: contains a Raindrop host literal`);
    assert(!/https?:\/\//.test(stripProse(src)), `${a.key}: builds an absolute URL in code`);
  }
});

/**
 * The prose stripper must not become a hole. It removes a URL sitting in a form
 * hint and leaves one in a call untouched — if that ever inverts, the guard
 * above is blind and this fails first.
 */
Deno.test("index: the prose stripper removes examples but not requests", () => {
  assertEquals(stripProse('hint: "see https://example.com for more",').includes("https://"), false);
  assertEquals(stripProse('placeholder: "https://example.com/a",').includes("https://"), false);
  assert(stripProse('ctx.fetch("https://evil.example/x")').includes("https://evil.example"));
  assert(stripProse('const API = "https://api.raindrop.io";').includes("https://api.raindrop.io"));
});

Deno.test("index: connection identity is never reachable as an action param", () => {
  const banned = /^(host|origin|domain|base_?url|api_?key|api_?token|token|account)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

// --- the singular/plural invariant, derived rather than listed ---------------

/**
 * Every request path an action builds, with `${…}` interpolations collapsed to
 * `{}` — derived from the source rather than hand-listed, so a new action is
 * covered the moment it is written.
 */
export function requestPaths(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:`(\/[^`]*)`|"(\/[^"]*)")/g)) {
    const literal = m[1] ?? m[2];
    out.push(literal.replace(/\$\{[^}]*\}/g, "{}"));
  }
  return out;
}

/**
 * The complete set of REST paths this app is allowed to build, transcribed from
 * `developer.raindrop.io` (2026-08-11). Anything else an action constructs is
 * either a typo or an undocumented endpoint, and the API cannot tell you which:
 * authentication runs before routing, so an unauthenticated probe answers the
 * same 72-byte 401 for a real path and a nonsense one.
 *
 * The singular/plural pairs in this list are the point. `/collection/{}` and
 * `/collections` are different endpoints, as are `/raindrop/{}` and
 * `/raindrops/{}`, and `/backup` and `/backups`. Swapping one for the other is
 * the single easiest mistake to make against this API and the hardest to see in
 * a diff.
 */
const DOCUMENTED_PATHS = new Set([
  "/collections",
  "/collections/childrens",
  "/collections/merge",
  "/collections/clean",
  "/collections/covers",
  "/collections/covers/{}",
  "/collection",
  "/collection/{}",
  "/collection/{}/sharing",
  "/collection/{}/sharing/{}",
  "/raindrops/{}",
  "/raindrop/{}",
  "/raindrops",
  "/raindrop",
  "/raindrop/suggest",
  "/raindrop/{}/suggest",
  "/highlights",
  "/highlights/{}",
  "/tags",
  "/tags/{}",
  "/user",
  "/user/stats",
  "/filters/{}",
  "/import/url/parse",
  "/import/url/exists",
  "/backups",
  "/backup",
]);

Deno.test("index: every path an action builds is one the vendor documents", async () => {
  const seen = new Set<string>();
  for (const a of app.actions) {
    for (const path of requestPaths(await actionSource(a.key))) {
      seen.add(path);
      assert(
        DOCUMENTED_PATHS.has(path),
        `${a.key}: builds \`${path}\`, which is not a documented Raindrop path — check the ` +
          "singular/plural spelling",
      );
    }
  }
  // A derivation that found nothing would pass vacuously and prove nothing.
  // 25 of the 26 documented paths are reachable: `/collection/{}/sharing/{}` is
  // built by two actions and every other path by one, and no action builds
  // `/raindrops` and `/raindrop` from the same file.
  assert(seen.size >= 24, `expected the actions to build ≥24 distinct paths, found ${seen.size}`);
});

Deno.test("index: the request-path derivation actually finds paths", () => {
  assertEquals(requestPaths('const p = "/user/stats";'), ["/user/stats"]);
  assertEquals(requestPaths("const p = `/raindrop/${id}/suggest`;"), ["/raindrop/{}/suggest"]);
  assertEquals(
    requestPaths("const p = `/collection/${a}/sharing/${b}`;"),
    ["/collection/{}/sharing/{}"],
  );
});

// --- auth ------------------------------------------------------------------

Deno.test("index: both auth methods declare a secret-typed credential or an OAuth config", () => {
  const keys = app.auth.map((m) => m.key);
  assertEquals(keys, ["test-token", "oauth2"]);

  for (const method of app.auth) {
    assertEquals(typeof method.test, "function", `${method.key}: no test hook`);
    assertEquals(typeof method.sign, "function", `${method.key}: no sign hook`);
    for (const f of method.fields ?? []) {
      assertEquals(f.type, "secret", `${method.key}/${f.key}: credential field is not "secret"`);
    }
  }
});

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out — a
 * whoami is exactly where Mailjet, Follow Up Boss and ElevenLabs each hand the
 * caller's own key back. Raindrop's `GET /rest/v1/user` was walked field by
 * field against the reference and returns no credential material (its
 * `password` field is a boolean meaning "does this account have a password"),
 * which is why it is the probe. If someone swaps it, this makes them do it
 * deliberately.
 */
Deno.test("index: the auth probe is /user and both methods share it", async () => {
  const probe = code(await Deno.readTextFile(new URL("../auth/probe.ts", import.meta.url)));
  assert(/PROBE_PATH\s*=\s*"\/user"/.test(probe), "the shared probe path is no longer /user");

  for (const file of ["test-token", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${file}.ts`, import.meta.url)));
    assert(src.includes("PROBE_PATH"), `auth/${file}.ts no longer uses the shared probe path`);
    assert(
      src.includes("classifyProbe"),
      `auth/${file}.ts no longer classifies from the response body`,
    );
  }
});

/**
 * The rejected shortcut, kept rejected. Raindrop returns the same HTTP 401 for
 * "no credential arrived" and "credential rejected", so a test hook that decided
 * from `res.status` alone would report a wiring bug as an expired token. Both
 * methods must reach a verdict through `classifyProbe`, which reads
 * `errorMessage`.
 */
Deno.test("index: no auth method decides validity from the status code alone", async () => {
  for (const file of ["test-token", "oauth2"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${file}.ts`, import.meta.url)));
    assert(
      !/res\.status\s*===\s*401/.test(src),
      `auth/${file}.ts branches on a bare 401 instead of reading the body`,
    );
    assert(
      !/return\s*\{\s*ok:\s*res\.ok/.test(src),
      `auth/${file}.ts trusts res.ok — Raindrop answers 200 for a failed OAuth exchange`,
    );
  }
});

/** OAuth endpoints must be the measured final URLs, not the redirecting ones. */
Deno.test("index: the OAuth URLs are the api.raindrop.io endpoints the 307 points at", () => {
  const method = app.auth.find((m) => m.key === "oauth2");
  assertEquals(method?.oauth2?.authorizationUrl, "https://api.raindrop.io/v1/oauth/authorize");
  assertEquals(method?.oauth2?.tokenUrl, "https://api.raindrop.io/v1/oauth/access_token");
  assertEquals(method?.oauth2?.refreshUrl, "https://api.raindrop.io/v1/oauth/access_token");
  // Raindrop documents no scopes and no PKCE; inventing either would be worse
  // than declaring none.
  assertEquals(method?.oauth2?.scopes, undefined);
  assertEquals(method?.oauth2?.pkce, false);
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
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };

  assertEquals(manifest.w6w.id, "io.w6w.raindrop");
  assertEquals(manifest.w6w.network.allow, ["api.raindrop.io"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.raindrop.io"));
  // And 127.0.0.1 has no business in a manifest that never calls it.
  assert(!manifest.w6w.network.allow.includes("127.0.0.1"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
});

Deno.test("index: the icon is the vendor's own mark, byte-for-byte", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // Downloaded verbatim from https://help.raindrop.io/favicon.svg on
  // 2026-08-11: 972 bytes, md5 e6a64a722107f2b4cc88171ef73fb96f, a 48x48
  // raindrop built from three brand colours plus a gradient overlay.
  assertEquals(svg.length, 972, "icon.svg is no longer the 972-byte vendor file");
  assert(svg.includes('width="48" height="48"'));
  for (const colour of ["#1988e0", "#2cc3ed", "#3147ff"]) {
    assert(svg.includes(colour), `vendor colour ${colour} missing — the mark was redrawn`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
