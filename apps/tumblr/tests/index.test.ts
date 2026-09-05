import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 23;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
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
 * Every mutating call this app makes targets a resource identified by an
 * explicit field (blog + post id, or the blog URL to follow/unfollow) rather
 * than an implicit "whatever I just created" cursor, so retrying with the
 * same input really does reach the same end state.
 */
Deno.test("index: every declared-idempotent perform action is genuinely retry-safe", () => {
  for (
    const key of [
      "post-delete",
      "post-update",
      "user-follow",
      "user-unfollow",
      "user-like",
      "user-unlike",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, true, key);
  }
  // Creating a post is NOT safe to retry blind — a dropped-response retry
  // would publish the post twice, since the endpoint takes no idempotency key.
  assertEquals(app.actions.find((a) => a.key === "post-create")?.idempotent, false);
});

Deno.test("index: only blog-avatar-get opts out of requiring a Connection", () => {
  const optedOut = app.actions.filter((a) => a.requiresAuth === false);
  assertEquals(optedOut.map((a) => a.key), ["blog-avatar-get"]);
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.key === "string" && p.key.length > 0, `${a.key}: param without a key`);
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
    }
  }
});

/** Strip comments so the sandbox guards below scan CODE, not prose. */
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
 * The API origin lives in `lib/client.ts` and nowhere else, EXCEPT
 * `blog-avatar-get`, which builds its own absolute URL because it needs
 * `redirect: "manual"` and never goes through `TumblrClient` — see that
 * file's docstring. Every other action must go through the shared client.
 */
Deno.test("index: no action other than blog-avatar-get hard-codes the API host", async () => {
  for (const a of app.actions) {
    if (a.key === "blog-avatar-get") continue;
    const src = await actionSource(a.key);
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

// --- auth --------------------------------------------------------------

Deno.test("index: the credential field is declared secret, and only OAuth2 is implemented", () => {
  const [method] = app.auth;
  assertEquals(method.key, "oauth2");
  assertEquals(method.type, "oauth2");
  assertEquals(typeof method.oauth2?.authorizationUrl, "string");
  assertEquals(typeof method.oauth2?.tokenUrl, "string");
  // No OAuth1.0a plumbing anywhere in this app — see auth/oauth2.ts's docstring.
  for (const f of method.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof method.test, "function");
  assertEquals(typeof method.sign, "function");
});

Deno.test("index: no source file implements OAuth 1.0a signing", async () => {
  for (const dir of ["actions", "auth", "lib", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(
        !/oauth_signature|oauth_nonce|HMAC-SHA1/.test(src),
        `${dir}/${entry.name}: OAuth1.0a signing found`,
      );
    }
  }
});

// --- health --------------------------------------------------------------

Deno.test("index: the health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

/** A check that reads a feed must be unsigned — a status host never sees the token. */
Deno.test("index: the feed-backed health check is unsigned", () => {
  const feedBacked = app.healthChecks.filter((h) => h.feed);
  assert(feedBacked.length > 0, "no check declares a feed — this test would pass vacuously");
  for (const h of feedBacked) {
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: reads a feed while signed`,
    );
  }
});

// --- manifest --------------------------------------------------------------

Deno.test("index: the manifest allows only the API host, and the icon is on disk", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] }; appearance: { icon: { svg: string } } } };
  assertEquals(manifest.w6w.id, "io.w6w.tumblr");
  assertEquals(manifest.w6w.network.allow, ["api.tumblr.com"]);
  // The status feed host belongs to the health check's own (implicit) allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("automatticstatus.com"));
  assertEquals(manifest.w6w.appearance.icon.svg, "./assets/icon.svg");
  await Deno.stat(new URL("../assets/icon.svg", import.meta.url));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
