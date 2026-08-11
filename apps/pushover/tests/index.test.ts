import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import quota from "../health/quota.ts";
import service from "../health/service.ts";
import { mockPushoverCtx, ok } from "./_helpers.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 4);
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

/**
 * The guard that matters most here.
 *
 * Pushover takes its credentials as ordinary form fields, so the usual "no
 * Authorization header in an action" check would miss the real risk entirely: an
 * action could simply put `token=` in the body it builds. Both names are banned
 * from executable action code, and `sign` is the only thing that may set them.
 *
 * `user` is subtler — `message-send` and `user-validate` legitimately send a
 * `user` field for the recipient override. What they must never do is read the
 * *credential's* user key, so the ban is on reading a credential, not on the
 * parameter name.
 */
Deno.test("index: no action supplies the token, and none reads a credential", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets an auth header`);
    assert(!/["'`]token["'`]\s*:/.test(src), `${a.key}: puts a token in a request`);
    assert(!/\btoken\s*=/.test(src), `${a.key}: assigns a token`);
    assert(!/\.token\b/.test(src), `${a.key}: reads a token property`);
  }
});

Deno.test("index: no action calls global fetch or touches Deno.*", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
  }
});

/** The host is fixed and lives in the client; an action must not name it. */
Deno.test("index: no action hard-codes the API host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/api\.pushover\.net/.test(src), `${a.key}: contains the API host`);
  }
});

Deno.test("index: the credential is never an action param", () => {
  const banned = /^(token|app_?token|user_?key|api_?key|secret)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: credential leaked into params`);
    }
  }
});

Deno.test("index: both halves of the credential are secret auth fields", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["token", "user"]);
  assert(fields.every((f) => f.type === "secret"), "both are private per the vendor");
});

/**
 * The probe is pinned by path: `/1/users/validate.json` is the only endpoint
 * that checks both halves of the credential. The application-scoped endpoints
 * would let a wrong user key through.
 */
Deno.test("index: the auth probe is /1/users/validate.json", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/app-token.ts", import.meta.url)));
  assert(src.includes("/1/users/validate.json"), "auth probe moved off users/validate");
});

Deno.test("index: every health check is either probing or declared unavailable", () => {
  for (const h of app.healthChecks) {
    const hasCheck = typeof h.check === "function";
    const hasUnavailable = typeof h.unavailable?.reason === "string";
    assert(hasCheck !== hasUnavailable, `${h.key}: must have exactly one of check/unavailable`);
    assert(typeof h.title === "string" && h.title.length > 0, `${h.key}: no title`);
  }
});

Deno.test("index: every unavailable health check is informational", () => {
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", `${h.key}: unavailable but not informational`);
  }
});

/**
 * The trap, kept named. `pushover.statuspage.io` answers 200 with 127,697 bytes
 * — the signature of an UNCLAIMED Statuspage subdomain, not Pushover's page.
 * Nothing may fetch it.
 *
 * The ban is on a **fetchable URL**, not on the hostname appearing at all:
 * `health/service.ts`'s `unavailable.reason` names the trap deliberately, so
 * that a future reader knows why the obvious-looking host was rejected. A guard
 * that banned the word would force that explanation to be deleted, which is the
 * opposite of what it is for — the same lesson the sibling apps' comment
 * stripper encodes, except here the prose lives in a string literal rather than
 * a comment.
 */
Deno.test("index: nothing fetches the unclaimed pushover.statuspage.io", async () => {
  for (const dir of ["actions", "auth", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const src = code(
        await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url)),
      );
      assert(
        !/https?:\/\/[^"'`\s]*statuspage\.io/.test(src),
        `${dir}/${entry.name}: builds a URL to an unclaimed statuspage.io host`,
      );
    }
  }
});

Deno.test("service: is a declared absence, with the reason and the trap recorded", () => {
  assertEquals(typeof service.check, "undefined");
  assertEquals(service.severity, "informational");
  assert(service.unavailable!.reason.includes("UNCLAIMED"), service.unavailable!.reason);
});

/**
 * `quota` is the opposite: a live probe with real numbers, because Pushover
 * genuinely publishes the monthly allowance.
 */
Deno.test("quota: is a live, signed, per-connection check", () => {
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "context");
  // Not informational: the number is real for every connection, and an
  // exhausted monthly allowance is a genuine outage of this integration.
  assertEquals(quota.severity, undefined);
});

Deno.test("quota: reads the allowance and reports headroom", async () => {
  const { ctx, calls } = mockPushoverCtx([{
    body: ok({ limit: 10000, remaining: 7496, reset: 1393653600 }),
  }]);
  const result = await quota.check!({} as never, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/apps/limits.json");
  assertEquals(result.state, "ok");
  assert(result.message!.includes("7496/10000 messages left"), result.message);
});

/** A monthly allowance at zero really does mean this connection cannot send. */
Deno.test("quota: zero remaining is down, not merely degraded", async () => {
  const { ctx } = mockPushoverCtx([{
    body: ok({ limit: 10000, remaining: 0, reset: 1393653600 }),
  }]);
  const result = await quota.check!({} as never, ctx);
  assertEquals(result.state, "down");
  assert(result.message!.includes("no messages can be sent"), result.message);
});

Deno.test("quota: judges headroom as a fraction of the allowance", async () => {
  const low = mockPushoverCtx([{ body: ok({ limit: 10000, remaining: 500 }) }]);
  assertEquals((await quota.check!({} as never, low.ctx)).state, "degraded");
  const fine = mockPushoverCtx([{ body: ok({ limit: 10000, remaining: 5000 }) }]);
  assertEquals((await quota.check!({} as never, fine.ctx)).state, "ok");
});

Deno.test("quota: an unreadable or rejected response is unknown, not down", async () => {
  const rejected = mockPushoverCtx([{ body: { status: 0 } }]);
  assertEquals((await quota.check!({} as never, rejected.ctx)).state, "unknown");
  const broken = mockPushoverCtx([{ status: 503, body: "" }]);
  assertEquals((await quota.check!({} as never, broken.ctx)).state, "unknown");
  const empty = mockPushoverCtx([{ body: ok() }]);
  assertEquals((await quota.check!({} as never, empty.ctx)).state, "unknown");
});

/**
 * The allowlist names the single real host. Pushover is SaaS-only, so unlike
 * the self-hosted apps in this pack there is nothing to widen for.
 */
Deno.test("index: the manifest names one fixed host", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as { w6w: { id: string; network: { allow: string[] } } };
  assertEquals(manifest.w6w.id, "io.w6w.pushover");
  assertEquals(manifest.w6w.network.allow, ["api.pushover.net"]);
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// token\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
