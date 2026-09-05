import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 6);
  assertEquals(app.auth!.length, 1);
  assertEquals(app.healthChecks!.length, 2);
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

Deno.test("index: every param declares a label and a type", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(typeof p.label === "string" && p.label.length > 0, `${a.key}/${p.key}: no label`);
      assert(typeof p.type === "string" && p.type.length > 0, `${a.key}/${p.key}: no type`);
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
    assert(!/\bBearer\b/.test(src), `${a.key}: builds a bearer header itself`);
    assert(!/\bheaders\b\s*[:=]/.test(src), `${a.key}: assembles request headers itself`);
  }
});

Deno.test("index: no action exposes the credential as a param", () => {
  const banned = ["apikey", "accesstoken", "token", "secret", "password", "authorization"];
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !banned.includes(p.key.toLowerCase()),
        `${a.key}: declares a credential-ish param "${p.key}"`,
      );
      assert(p.type !== "secret", `${a.key}/${p.key}: an action must not collect a secret`);
    }
  }
});

/**
 * The credential this app collects is a single opaque API key — there is no
 * introspection response with fields worth naming, unlike Attio's `/v2/self`.
 * This is the belt-and-braces guard that nothing outside `auth/api-key.ts`
 * ever mentions the credential's field name.
 */
Deno.test("index: nothing outside auth/api-key.ts names the credential field", async () => {
  const dirs = ["actions", "health", "lib"];
  const leak = /\bapiKey\b/;
  for (const dir of dirs) {
    const base = new URL(`../${dir}/`, import.meta.url);
    for await (const entry of Deno.readDir(base)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(await Deno.readTextFile(new URL(entry.name, base)));
      assert(!leak.test(src), `${dir}/${entry.name}: names the credential field`);
    }
  }
});

Deno.test("index: health checks cover service and quota, keyed and titled", () => {
  const keys = app.healthChecks!.map((h) => h.key);
  assertEquals(keys.sort(), ["quota", "service"]);
  for (const h of app.healthChecks!) {
    assert(h.title.length > 0, `${h.key}: no title`);
    assert(
      h.check !== undefined || h.unavailable !== undefined,
      `${h.key}: neither check nor unavailable`,
    );
  }
});

/**
 * An `unavailable` entry reports `unknown`, and at the default `degraded`
 * severity that would pin the app at `unknown` forever. Every declared-absent
 * check must therefore be `informational`.
 */
Deno.test("index: any unavailable health check is informational", () => {
  for (const h of app.healthChecks!) {
    if (!h.unavailable) continue;
    assertEquals(
      h.severity,
      "informational",
      `${h.key}: unavailable checks must be informational or they pin the app at unknown`,
    );
    assert(h.unavailable.reason.length > 0, `${h.key}: unavailable without a reason`);
  }
});

/**
 * A signed health check may not widen egress — `network.allow` is bound to an
 * unsigned posture, because a status host is exactly the host that must never
 * see a credential.
 */
Deno.test("index: no signed health check declares its own network allowlist", () => {
  for (const h of app.healthChecks!) {
    const posture = h.credential ?? (h.kind === "service" ? "none" : "signed");
    if (posture !== "signed") continue;
    assertEquals(h.network, undefined, `${h.key}: signed checks may not widen egress`);
  }
});

/**
 * Every host the app reaches must be declared. `lib`/`auth` may only touch
 * `api.telnyx.com`; the status host is widened for the one unsigned service
 * hook alone. `actions/` is deliberately excluded here — every action calls
 * `TelnyxClient` with a relative path rather than building an absolute URL,
 * so it never contains a literal host at all; the "https://example.com/..."
 * strings that DO appear there are placeholder/hint text for the media-URL
 * and webhook-URL params, not a network destination.
 */
Deno.test("index: auth and lib call only api.telnyx.com", async () => {
  for (const dir of ["lib", "auth"]) {
    const base = new URL(`../${dir}/`, import.meta.url);
    for await (const entry of Deno.readDir(base)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(await Deno.readTextFile(new URL(entry.name, base)));
      for (const [, host] of src.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) {
        assertEquals(host, "api.telnyx.com", `${dir}/${entry.name}: undeclared host ${host}`);
      }
    }
  }
});

/**
 * The actual guarantee for `actions/`: every action reaches the network only
 * through `TelnyxClient`, never `ctx.fetch` directly — so it structurally
 * cannot build an absolute URL to an undeclared host, no matter what
 * placeholder text its params carry.
 */
Deno.test("index: no action calls ctx.fetch directly — only through TelnyxClient", async () => {
  const base = new URL("../actions/", import.meta.url);
  for await (const entry of Deno.readDir(base)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(entry.name, base)));
    assert(!/ctx\.fetch/.test(src), `actions/${entry.name}: calls ctx.fetch directly`);
    assert(/TelnyxClient/.test(src), `actions/${entry.name}: does not use TelnyxClient`);
  }
});

Deno.test("index: package.json's network.allow matches what the app actually calls", async () => {
  const pkg = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  );
  assertEquals(pkg.w6w.network.allow, ["api.telnyx.com"]);
});
