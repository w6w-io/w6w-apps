import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 14);
  assertEquals(app.auth?.length, 2);
  assertEquals(app.healthChecks?.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a valid type, a description, output and an execute hook", () => {
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

/** Creating a room always creates a NEW room — retrying would create a second one. */
Deno.test("index: create-room is the one perform action that is not idempotent", () => {
  const nonIdempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key);
  assertEquals(nonIdempotent, ["create-room"]);
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
    assert(!/accessToken\s*[:=]/.test(src), `${a.key}: reads/sets an access token directly`);
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
 * The homeserver URL is half the credential's identity. It must never be an
 * action param and never a literal — either would let two actions on one
 * Connection address two different homeservers.
 */
Deno.test("index: no action hard-codes a homeserver host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/https?:\/\//.test(src), `${a.key}: contains an absolute URL literal`);
  }
});

Deno.test("index: the homeserver URL is never an action param", () => {
  const banned =
    /^(homeserver_?url|base_?url|server_?url|instance_?url|host|origin|domain|access_?token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: both auth methods carry the homeserver URL as a field", () => {
  for (const auth of app.auth ?? []) {
    const fields = auth.fields ?? [];
    assert(
      fields.some((f) => f.key === "homeserverUrl"),
      `${auth.key}: no homeserverUrl field`,
    );
  }
});

/** The credential's secret half must always be masked. */
Deno.test("index: every auth method's token/password field is type secret", () => {
  for (const auth of app.auth ?? []) {
    const secretish = (auth.fields ?? []).filter((f) => /token|password/i.test(f.key));
    assert(secretish.length > 0, `${auth.key}: no token/password field found`);
    for (const f of secretish) assertEquals(f.type, "secret", `${auth.key}/${f.key}`);
  }
});

/**
 * The auth probe is pinned by path. `/account/whoami` needs a credential,
 * needs no other permission, and returns no token.
 */
Deno.test("index: both auth methods' test hook probes account/whoami", async () => {
  for (const key of ["access-token", "password"]) {
    const src = code(await Deno.readTextFile(new URL(`../auth/${key}.ts`, import.meta.url)));
    assert(
      src.includes("checkWhoami") || src.includes("account/whoami"),
      `${key}: no whoami probe`,
    );
  }
});

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks ?? []) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  for (const h of (app.healthChecks ?? []).filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the token. */
Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks ?? []) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

/**
 * The manifest has to allow `*`: Matrix is a federated protocol, so the
 * reachable host is whichever homeserver the account lives on and cannot be
 * enumerated at publish time.
 */
Deno.test("index: the manifest allows any host, because the homeserver is the host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.matrix");
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assert(manifest.w6w.categories.includes("communication"));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// bearer\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
