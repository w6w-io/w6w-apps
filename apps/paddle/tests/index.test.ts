import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 21);
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
 * The two actions that move money must never be marked idempotent — the runtime
 * may retry an idempotent perform, and Paddle has no idempotency key on either
 * endpoint, so a retry creates a second entity.
 */
Deno.test("index: the actions that create money-moving entities are not idempotent", () => {
  for (const key of ["adjustment-create", "customer-create", "product-create", "price-create"]) {
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
    assert(!/api[_-]?key/i.test(src), `${a.key}: touches the API key`);
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
 * The environment is a property of the credential, resolved in `sign`. An
 * action that hard-coded a host — or accepted one as a param — could send a
 * sandbox key to production, or split one Connection across both environments.
 */
Deno.test("index: no action hard-codes an API host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/paddle\.com/.test(src), `${a.key}: contains a Paddle host literal`);
  }
});

Deno.test("index: the environment is never reachable as an action param", () => {
  const banned = /^(environment|sandbox|host|origin|domain|base_?url|api_?key|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

/**
 * The auth probe is pinned by path.
 *
 * Choosing it is the step where a credential most easily leaks back out (Follow
 * Up Boss's `/me` returns the caller's own API key; Mailjet's `/apikey` returns
 * key and secret) or where a check quietly stops checking. `/event-types` was
 * chosen because it is the only endpoint that requires a credential but no
 * permission, and returns nothing about the account. If someone swaps it, this
 * makes them do it deliberately.
 */
Deno.test("index: the auth probe is /event-types", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/event-types"), "auth probe no longer hits /event-types");
});

/**
 * The rejected probe, kept rejected. `GET /ips` answers 200 with no
 * Authorization header at all, so a Connection whose credential never got
 * attached would pass a probe against it.
 */
Deno.test("index: nothing probes /ips, which answers without a credential", async () => {
  for (const dir of ["auth", "health", "actions", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(!/["'`]\/ips\b/.test(src), `${dir}/${entry.name}: probes /ips`);
    }
  }
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
 */
Deno.test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/** A check that widens egress must be unsigned — a status host never sees the key. */
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
 * The manifest's allowlist is the sandbox's actual enforcement point. Both
 * environment hosts must be there, or a sandbox connection is blocked outright.
 */
Deno.test("index: the manifest allows both environment hosts", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.paddle");
  assert(manifest.w6w.network.allow.includes("api.paddle.com"));
  assert(manifest.w6w.network.allow.includes("sandbox-api.paddle.com"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("paddlestatus.com"));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  // A URL's `//` must survive — stripping it would corrupt the scanned text.
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
