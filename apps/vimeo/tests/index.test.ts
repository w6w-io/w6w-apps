import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 36);
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
 * The three actions that create a new entity every time they run must never be
 * marked idempotent: the runtime may retry an idempotent perform, and Vimeo
 * offers no idempotency key on any of these endpoints, so a retry produces a
 * second video, comment or reply.
 *
 * `showcase-create` and `folder-create` are here for the same reason — neither
 * enforces name uniqueness.
 */
Deno.test("index: actions that create a new entity per call are not idempotent", () => {
  for (
    const key of [
      "video-upload-pull",
      "comment-create",
      "comment-reply-create",
      "folder-create",
      "showcase-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
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
 * Without this the checks are simultaneously too weak and too strong: the doc
 * comment in `auth/access-token.ts` explaining *why* an action never touches the
 * credential would trip the assertion, while a reviewer's natural fix —
 * deleting the explanation — would leave a real violation just as invisible.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const readSource = (path: string) =>
  Deno.readTextFile(new URL(`../${path}`, import.meta.url)).then(code);

const actionSource = (key: string) => readSource(`actions/${key}.ts`);

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbearer\b/i.test(src), `${a.key}: builds a bearer token`);
    assert(!/access[_-]?token/i.test(src), `${a.key}: touches the access token`);
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
 * Strip user-facing prose (`hint`, `description`, `placeholder`, `label`,
 * `title`) so the host scan below sees only executable code.
 *
 * This mirrors the pack auditor's own rule (`_tools/audit.ts`, check
 * `network/undeclared-host`) and exists for the same reason: several params
 * legitimately quote the vendor's documented example, and `video-search`'s
 * `links` parameter takes literal `https://vimeo.com/…` URLs, so its
 * placeholder must contain one. A placeholder is never a request target — only
 * code is — so removing prose narrows the scan to exactly what the assertion is
 * about, without letting any executable host literal through.
 */
function stripProse(src: string): string {
  return src.replace(
    /\b(?:hint|description|placeholder|label|title):\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)(?:\s*\+\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`))*/g,
    "",
  );
}

/**
 * Every request must be built through `VimeoClient`, which is the one place the
 * versioned `Accept` header, the User-Agent and the error formatting live. An
 * action that assembled its own URL would silently drop all three.
 */
Deno.test("index: no action hard-codes an API host in code", async () => {
  for (const a of app.actions) {
    const src = stripProse(await actionSource(a.key));
    assert(!/vimeo\.com/.test(src), `${a.key}: contains a Vimeo host literal`);
  }
});

Deno.test("index: the prose stripper removes only prose, so the host scan still bites", () => {
  const sample = 'placeholder: "https://vimeo.com/1",\n' +
    'const u = "https://api.vimeo.com/me";';
  const stripped = stripProse(sample);
  assert(!stripped.includes("https://vimeo.com/1"), "prose survived the stripper");
  assert(stripped.includes("https://api.vimeo.com/me"), "the stripper ate executable code");
});

/**
 * Vimeo is addressed by exactly one fixed host, `api.vimeo.com` — there is no
 * per-tenant subdomain and no environment split — so no action may take the
 * request target as input.
 *
 * `domain` is deliberately absent from this list, unlike in a per-tenant app's
 * copy of the same guard: `showcase-update/domain` is a documented *showcase*
 * body field ("the custom domain of the showcase"), not a request target. The
 * host itself is covered by the code scan above, which is the assertion that
 * would actually catch a redirected request.
 */
Deno.test("index: the connection's identity is never reachable as an action param", () => {
  const banned = /^(host|origin|base_?url|api_?key|token|access_?token|user_?agent)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/**
 * Any param whose name says "password" must be `type: "secret"`.
 *
 * Vimeo has three unrelated passwords in play — a video's viewing password, a
 * showcase's, and the query parameter that unlocks a protected showcase — and
 * all three are the user's secrets even though none is this connection's
 * credential. A plain `string` param would render them unmasked and store them
 * in cleartext.
 */
Deno.test("index: every password-shaped param is a secret", () => {
  let seen = 0;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      if (!/password/i.test(p.key)) continue;
      seen++;
      assertEquals(p.type, "secret", `${a.key}/${p.key}: password param is not type "secret"`);
    }
  }
  // video-update, video-upload-pull, showcase-create, showcase-update,
  // showcase-video-list. If this number moves, a password param was added or
  // removed and the assertion above needs to have seen it.
  assertEquals(seen, 5, "unexpected number of password params");
});

/**
 * The auth probe is pinned by path AND by its field filter.
 *
 * Choosing it is the step where a secret most easily leaks back out. `/me` is
 * correct here — it is the only endpoint that needs a user-bound token and no
 * extra scope — but the *unfiltered* `/me` returns
 * `preferences.videos.password` in cleartext. The `fields=uri,name` is what
 * makes the probe safe, so it is asserted, not just the path.
 *
 * The assertion counts `ctx.fetch` calls and requires every one of them to be a
 * filtered probe. That is the form that actually holds: an earlier version
 * banned any bare `"/me"` string in the module, which flagged the *label*
 * passed to `formatVimeoError` — a message, not a request — while still not
 * proving that the calls it did allow were filtered.
 */
Deno.test("index: every network call in the auth module is a field-filtered /me", async () => {
  const src = await readSource("auth/access-token.ts");
  const fetches = src.match(/ctx\.fetch\s*\(/g) ?? [];
  const probes = src.match(/\$\{API_BASE\}\/me\?fields=[a-z,]+/g) ?? [];
  // One in `test`, one in `afterConnect`, and nothing else reaches the network.
  assertEquals(fetches.length, 2, "expected exactly two ctx.fetch calls in the auth module");
  assertEquals(probes.length, fetches.length, "a ctx.fetch call is not a filtered /me probe");
  for (const probe of probes) {
    assertEquals(probe, "${API_BASE}/me?fields=uri,name", "auth probe lost its field filter");
  }
});

/** The quota probe is filtered for the same reason, plus the doubled-figure one. */
Deno.test("index: the quota probe is a field-filtered /me", async () => {
  const src = await readSource("health/quota.ts");
  assert(src.includes("/me?fields=uri"), "quota probe lost its field filter");
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
 * Rule 1 of the health-check severity contract: an `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * severity but `informational` a declared absence pins the App at `unknown`
 * forever.
 *
 * This app declares no absences today. The rule is enforced anyway, because the
 * day someone adds one is exactly the day nobody remembers it.
 */
Deno.test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/**
 * The quota check reports `unknown` whenever Vimeo omits the rate-limit headers
 * — measured to happen on an unauthenticated call — so it carries the same
 * severity rule as a declared absence for the same reason.
 */
Deno.test("index: the quota check is informational, so an unknown cannot pin the verdict", () => {
  assertEquals(app.healthChecks.find((h) => h.key === "quota")?.severity, "informational");
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/**
 * The manifest's allowlist is the sandbox's actual enforcement point.
 *
 * The status host belongs to the service check's own allowlist and must NOT be
 * here: `w6w.network.allow` widens egress for every hook including the signed
 * ones, which is how a status page ends up seeing a credential.
 */
Deno.test("index: the manifest allows the API host and not the status host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.vimeo");
  assert(manifest.w6w.network.allow.includes("api.vimeo.com"));
  assert(!manifest.w6w.network.allow.includes("www.vimeostatus.com"));
  assert(!manifest.w6w.network.allow.includes("status.vimeo.com"));
});

/**
 * The status host is pinned to the canonical one.
 *
 * `status.vimeo.com` answers `301` to `www.vimeostatus.com`, and a health check
 * may only reach hosts it declared — so following that redirect is either
 * blocked or parses a Cloudflare interstitial as a status document. If someone
 * "tidies" the URL back, this fails.
 */
Deno.test("index: the service check calls the canonical status host, not the redirecting one", async () => {
  const src = await readSource("health/service.ts");
  assert(src.includes("www.vimeostatus.com"), "service check lost the canonical status host");
  assert(!/["'`]status\.vimeo\.com/.test(src), "service check points at the redirecting host");
  const service = app.healthChecks.find((h) => h.key === "service");
  assertEquals(service?.network?.allow, ["www.vimeostatus.com"]);
});

/**
 * The versioned Accept header is what pins the API contract. Vimeo has no path
 * prefix, so dropping it silently floats the app onto whatever the API treats
 * as default.
 */
Deno.test("index: the client sends an explicit API version in Accept", async () => {
  const src = await readSource("lib/client.ts");
  assert(
    src.includes("application/vnd.vimeo.*+json;version="),
    "client lost the versioned Accept header",
  );
  const { ACCEPT, API_VERSION } = await import("../lib/client.ts");
  assertEquals(API_VERSION, "3.4");
  assertEquals(ACCEPT, "application/vnd.vimeo.*+json;version=3.4");
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// access-token\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
