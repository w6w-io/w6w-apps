import { assert, assertEquals } from "@std/assert";
import service, {
  componentId,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import instance from "../../health/instance.ts";
import quota from "../../health/quota.ts";
import { mockMattermostCtx } from "../_helpers.ts";

Deno.test("service: probes the vendor's Statuspage and declares only that host", () => {
  assertEquals(STATUS_URL, "https://status.mattermost.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.mattermost.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

/**
 * The page covers Mattermost Cloud, sign-up and the community server. A
 * self-hosted install is unaffected, and this check is app-scoped so it cannot
 * tell the two apart — at any higher severity an incident would pin every
 * self-hosted tenant at `degraded`.
 */
Deno.test("service: is informational — it speaks only for Mattermost Cloud", () => {
  assertEquals(service.severity, "informational");
});

Deno.test("mapComponentStatus / mapIndicator: cover Statuspage's vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("brand_new"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentId: slugifies a component name", () => {
  assertEquals(componentId("Cloud Workspaces"), "cloud-workspaces");
  assertEquals(componentId("Sign-Up"), "sign-up");
});

Deno.test("service: reports each component and the vendor roll-up", async () => {
  const { ctx } = mockMattermostCtx([{
    body: {
      page: { id: "kjs79hlhbrpk", name: "Mattermost", url: "https://status.mattermost.com" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "Cloud Workspaces", status: "operational" },
        { id: "c2", name: "Sign-Up", status: "operational" },
      ],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).sort(), ["cloud-workspaces", "sign-up"]);
});

Deno.test("service: a partial outage is degraded and named", async () => {
  const { ctx } = mockMattermostCtx([{
    body: {
      page: { name: "Mattermost", url: "https://status.mattermost.com" },
      status: { indicator: "minor" },
      components: [{ id: "c1", name: "Calls", status: "partial_outage" }],
      incidents: [{ name: "Degraded calls" }],
      scheduled_maintenances: [],
    },
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("calls"), result.message);
  assert(result.message!.includes("1 open incident"), result.message);
});

Deno.test("service: an unreachable status page is unknown, not down", async () => {
  const { ctx } = mockMattermostCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: refuses a page that no longer self-identifies as Mattermost's", async () => {
  const { ctx } = mockMattermostCtx([{
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

/**
 * `/api/v4/system/ping` is unauthenticated by design, which disqualifies it as a
 * credential probe and makes it exactly right here. The check must stay
 * unsigned.
 */
Deno.test("instance: is an unsigned per-connection dependency on the server's ping", () => {
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "none");
  assertEquals(instance.severity, undefined, "keeps the degraded default for its kind");
});

Deno.test("instance: a healthy ping reports ok and names the server version", async () => {
  const { ctx, calls } = mockMattermostCtx([{
    body: { status: "OK" },
    headers: { "content-type": "application/json", "x-version-id": "11.11.0.31364844342.abc.true" },
  }]);
  const result = await instance.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.message, "server 11.11.0");
  assertEquals(new URL(calls[0].url).pathname, "/api/v4/system/ping");
  assertEquals(calls[0].headers["authorization"], undefined, "must never send the token");
});

/**
 * A reverse proxy in front of a stopped Mattermost commonly answers 200 with its
 * own page, and Mattermost is very commonly behind one — so the body is read,
 * not just the status line.
 */
Deno.test("instance: a 200 without status OK is degraded, not healthy", async () => {
  const { ctx } = mockMattermostCtx([{ body: { message: "proxy up" } }]);
  const result = await instance.check!({} as never, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message!.includes("proxy"), result.message);
});

Deno.test("instance: a 5xx is down, a 4xx is degraded", async () => {
  const down = mockMattermostCtx([{ status: 502, body: "" }]);
  assertEquals((await instance.check!({} as never, down.ctx)).state, "down");
  const degraded = mockMattermostCtx([{ status: 404, body: "" }]);
  assertEquals((await instance.check!({} as never, degraded.ctx)).state, "degraded");
});

/**
 * The quota check is a live probe rather than a declared absence, which makes it
 * the exception in this pack — but rate limiting is off by default, so it must
 * not be able to drag the verdict to `unknown`.
 */
Deno.test("quota: is a live, unsigned, informational per-connection check", () => {
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
  assertEquals(quota.severity, "informational");
  assertEquals(quota.credential, "none");
  assertEquals(quota.scope, "connection");
});

Deno.test("quota: reads the headroom when the server publishes it", async () => {
  const { ctx } = mockMattermostCtx([{
    body: { status: "OK" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "10",
      "x-ratelimit-remaining": "9",
      "x-ratelimit-reset": "1",
    },
  }]);
  const result = await quota.check!({} as never, ctx);
  assertEquals(result.state, "ok");
  assert(result.message!.includes("9/10 remaining"), result.message);
  assert(result.message!.includes("resets in 1s"), result.message);
});

/** The common case: rate limiting left at its default, so nothing to read. */
Deno.test("quota: no headers means unknown, and says why", async () => {
  const { ctx } = mockMattermostCtx([{ body: { status: "OK" } }]);
  const result = await quota.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("rate limiting is disabled"), result.message);
});

/**
 * A ratio, not an absolute: Mattermost's default limit is 10/second, so "3
 * remaining" is routine there and alarming on a server configured for 100.
 */
Deno.test("quota: judges headroom as a fraction of the limit, not a raw count", async () => {
  const low = mockMattermostCtx([{
    body: { status: "OK" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "3",
    },
  }]);
  assertEquals((await quota.check!({} as never, low.ctx)).state, "degraded");

  const fine = mockMattermostCtx([{
    body: { status: "OK" },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "10",
      "x-ratelimit-remaining": "3",
    },
  }]);
  assertEquals((await quota.check!({} as never, fine.ctx)).state, "ok");
});

Deno.test("quota: zero remaining is degraded regardless of the limit", async () => {
  const { ctx } = mockMattermostCtx([{
    body: { status: "OK" },
    headers: { "content-type": "application/json", "x-ratelimit-remaining": "0" },
  }]);
  assertEquals((await quota.check!({} as never, ctx)).state, "degraded");
});

Deno.test("quota: an unreadable header is unknown rather than a wrong number", async () => {
  const { ctx } = mockMattermostCtx([{
    body: { status: "OK" },
    headers: { "content-type": "application/json", "x-ratelimit-remaining": "lots" },
  }]);
  const result = await quota.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("Unreadable"), result.message);
});
