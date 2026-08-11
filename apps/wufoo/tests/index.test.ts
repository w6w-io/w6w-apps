import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import service, { componentId, mapIndicator, STATUS_URL } from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 8);
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

async function sourcesIn(dir: string): Promise<Array<[string, string]>> {
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    out.push([
      `${dir}/${entry.name}`,
      code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
    ]);
  }
  return out;
}

const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

/**
 * THE guard this app exists to carry.
 *
 * `GET /api/v3/users.json` returns an `ApiKey` field for **every user on the
 * account** — other people's credentials, not just the caller's. It is the
 * obvious-looking whoami, which is exactly why it needs a test rather than a
 * comment: nothing in this app may call it, for any reason, including a nicer
 * connection label.
 */
Deno.test("index: nothing in the app touches users.json, which leaks every user's API key", async () => {
  for (const dir of ["actions", "auth", "health", "lib"]) {
    for (const [name, src] of await sourcesIn(dir)) {
      // The constant that *names* the banned path is allowed to exist; calling
      // it is not. Any string that would build the request is caught.
      assert(
        !/["'`][^"'`]*\/users\.json/.test(src),
        `${name}: builds a request to users.json`,
      );
    }
  }
  // And no action so much as mentions it.
  for (const a of app.actions) {
    assert(!/users\.json/.test(await actionSource(a.key)), `${a.key}: references users.json`);
  }
});

Deno.test("index: no action reads a credential — signing is the auth hook's job", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/authorization/i.test(src), `${a.key}: sets the auth header itself`);
    assert(!/\bbtoa\b/.test(src), `${a.key}: builds a Basic header itself`);
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
 * The subdomain is half the credential's identity: a key works only on its own
 * account's host. An action that took one — or hard-coded a host — could point
 * one Connection at two different accounts.
 */
Deno.test("index: no action hard-codes a host, and the subdomain is never a param", async () => {
  for (const a of app.actions) {
    assert(!/https?:\/\//.test(await actionSource(a.key)), `${a.key}: contains an absolute URL`);
  }
  const banned = /^(subdomain|account|site_?url|base_?url|host|origin|domain|api_?key)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: the credential's two parts are auth FIELDS, which is where they belong", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["subdomain", "apiKey"]);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
});

/** The auth probe is pinned by path — see the users.json guard above for why. */
Deno.test("index: the auth probe is forms.json", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes("/forms.json"), "auth probe no longer hits forms.json");
});

/**
 * The narrow wildcard is the point: unlike this pack's self-hosted apps, every
 * Wufoo account really is under one apex, so the allowlist can say so instead
 * of disabling egress restriction entirely.
 */
Deno.test("index: the manifest allows *.wufoo.com, not *", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { png?: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.wufoo");
  assertEquals(manifest.w6w.network.allow, ["*.wufoo.com"]);
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.wufoo.com"));
  assertEquals(manifest.w6w.appearance.icon.png, "./assets/icon.png");
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

Deno.test("index: any health check declaring extra egress is unsigned", () => {
  for (const h of app.healthChecks) {
    if (!h.network?.allow?.length) continue;
    assert(
      h.credential === "none" || h.credential === "context",
      `${h.key}: widens egress while signed`,
    );
  }
});

Deno.test("service: probes Wufoo's own Statuspage and declares only that host", () => {
  assertEquals(STATUS_URL, "https://status.wufoo.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.wufoo.com"]);
  assertEquals(service.credential, "none");
});

/** Wufoo is SaaS-only, so an incident really is evidence about every connection. */
Deno.test("service: keeps the degraded default — there is no self-hosted Wufoo", () => {
  assertEquals(service.severity, undefined);
});

Deno.test("mapIndicator / componentId: cover the vocabularies", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
  assertEquals(componentId("Form Builder"), "form-builder");
});

/**
 * The finding this check is shaped around: Wufoo's page ships an EMPTY
 * components array. The sibling checks in this pack treat that as `unknown`;
 * here it is the normal state, and the page indicator is the whole signal.
 */
Deno.test("service: an empty component list is healthy, not unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "ty0zzz68ykq3", name: "Wufoo", url: "https://status.wufoo.com" },
      components: [],
      incidents: [],
      scheduled_maintenances: [],
      status: { indicator: "none", description: "All Systems Operational" },
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components, undefined);
  assert(result.message!.includes("All Systems Operational"), result.message);
});

Deno.test("service: a page-level incident is reported from the indicator", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Wufoo", url: "https://status.wufoo.com" },
      components: [],
      incidents: [{ name: "Elevated errors" }],
      scheduled_maintenances: [],
      status: { indicator: "major", description: "Partial System Outage" },
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("1 open incident"), result.message);
});

/**
 * SurveyMonkey owns Wufoo and runs its own claimed status page one hop away.
 * Pointing at it would report a different product's health as this one's.
 */
Deno.test("service: refuses a page that no longer self-identifies as Wufoo's", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "SurveyMonkey", url: "https://status.surveymonkey.com" },
      components: [],
      status: { indicator: "none" },
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("self-identifies"), result.message);
});

Deno.test("service: an unreachable status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("quota: is declared unavailable with a reason, at informational severity", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("50 entry submissions"));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
