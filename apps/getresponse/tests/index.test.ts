import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import service, {
  componentId,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../health/service.ts";
import quota from "../health/quota.ts";
import { mockCtx } from "./_helpers.ts";

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 14);
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
 * GetResponse has no idempotency key. A retried create is a 409 or a duplicate;
 * a retried newsletter is a second broadcast to real people.
 */
Deno.test("index: the creating actions are not idempotent", () => {
  for (const key of ["contact-create", "tag-create", "newsletter-create"]) {
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
    assert(!/x-auth-token/i.test(src), `${a.key}: builds the auth header itself`);
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
 * The platform is half the credential's identity: a retail key is meaningless
 * against a MAX host. An action that hard-coded a host — or took one as a param
 * — could point one Connection at two platforms.
 */
Deno.test("index: no action hard-codes a host, and the platform is never a param", async () => {
  for (const a of app.actions) {
    assert(!/https?:\/\//.test(await actionSource(a.key)), `${a.key}: contains an absolute URL`);
    assert(
      !/getresponse(360)?\.(com|pl)/.test(await actionSource(a.key)),
      `${a.key}: names a host`,
    );
  }
  // `origin` is deliberately NOT banned: it is GetResponse's own field for how a
  // contact was added (import, www, api, …), and `contact-list` filters on it.
  // Banning the word would force a param name that no longer matches the API.
  const banned = /^(platform|host|domain|base_?url|api_?key|token)$/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!banned.test(p.key), `${a.key}/${p.key}: connection identity leaked into params`);
    }
  }
});

Deno.test("index: the credential's two parts are auth FIELDS, which is where they belong", () => {
  const fields = app.auth[0].fields ?? [];
  assertEquals(fields.map((f) => f.key), ["platform", "apiKey"]);
  assertEquals(fields.find((f) => f.key === "apiKey")?.type, "secret");
});

/**
 * The auth probe is pinned by path. `/accounts` returns the account that owns
 * the key and carries no key material, unlike the `/me`-shaped endpoints that
 * disqualify themselves elsewhere in this pack.
 */
Deno.test("index: the auth probe is /accounts", async () => {
  const src = code(await Deno.readTextFile(new URL("../auth/api-key.ts", import.meta.url)));
  assert(src.includes('PROBE_PATH = "/accounts"'), "auth probe moved off /accounts");
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

/**
 * All three platform hosts must be allowlisted by name — the set is closed and
 * known at publish time, so unlike the self-hosted apps in this pack there is no
 * reason to widen to a wildcard. Missing one blocks that platform outright.
 */
Deno.test("index: the manifest names all three platform hosts, and no wildcard", async () => {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    w6w: { id: string; network: { allow: string[] }; appearance: { icon: { png?: string } } };
  };
  assertEquals(manifest.w6w.id, "io.w6w.getresponse");
  assertEquals(manifest.w6w.network.allow.sort(), [
    "api.getresponse.com",
    "api3.getresponse360.com",
    "api3.getresponse360.pl",
  ]);
  assert(!manifest.w6w.network.allow.includes("*"));
  // The status host belongs to the health check's own allowlist, not the app's.
  assert(!manifest.w6w.network.allow.includes("status.getresponse.com"));
  assertEquals(manifest.w6w.appearance.icon.png, "./assets/icon.png");
});

Deno.test("service: probes the vendor's Statuspage and declares only that host", () => {
  assertEquals(STATUS_URL, "https://status.getresponse.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.getresponse.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

/**
 * GetResponse is SaaS-only — both retail and MAX are vendor-hosted — so an
 * incident really is evidence about every connection. That is the opposite call
 * from the open-source apps in this pack.
 */
Deno.test("service: keeps the degraded default — there is no self-hosted GetResponse", () => {
  assertEquals(service.severity, undefined);
});

Deno.test("mapComponentStatus / mapIndicator / componentId: cover the vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("brand_new"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(componentId("Contacts (+Import)"), "contacts-import");
});

Deno.test("service: reports each component and the vendor roll-up", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "ykjdtv1csj3l", name: "GetResponse", url: "https://status.getresponse.com" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "API", status: "operational" },
        { id: "c2", name: "Webhooks", status: "operational" },
      ],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).sort(), ["api", "webhooks"]);
});

Deno.test("service: a degraded component is reported and named", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "GetResponse", url: "https://status.getresponse.com" },
      status: { indicator: "minor" },
      components: [{ id: "c1", name: "API", status: "partial_outage" }],
      incidents: [{ name: "Elevated API errors" }],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("api"), result.message);
  assert(result.message!.includes("1 open incident"), result.message);
});

Deno.test("service: an unreachable status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: refuses a page that no longer self-identifies as GetResponse's", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Someone Else", url: "https://status.example.com" },
      status: { indicator: "none" },
      components: [{ id: "c1", name: "API", status: "operational" }],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("self-identifies"), result.message);
});

Deno.test("quota: is declared unavailable, informational, and names the 1015 code", () => {
  assertEquals(typeof quota.check, "undefined");
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.includes("1015"));
  // The sending-limits endpoint answers a different question and must stay out.
  assert(quota.unavailable!.reason.includes("sending-limits"));
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// api-key\nconst a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
});
