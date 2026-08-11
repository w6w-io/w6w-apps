import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../health/service.ts";
import apiStatus from "../health/api-status.ts";
import api, { isHelixErrorShape, PROBE_URL } from "../health/api.ts";
import quota, { QUOTA_URL, readRateLimit, stateFor } from "../health/quota.ts";
import { helixError, mockCtx } from "./_helpers.ts";

/** The six components measured on status.twitch.com on 2026-08-11. */
const SUMMARY = {
  page: { id: "yfj40zdsk34s", name: "Twitch", url: "https://status.twitch.com" },
  components: [
    { id: "yz28x40y5mq2", name: "Login", status: "operational" },
    { id: "j6dkmwm0h3k2", name: "Web", status: "operational" },
    { id: "4qrh4gj6bgt2", name: "Chat", status: "operational" },
    { id: "wkdq12ctv52c", name: "Video (Watching)", status: "operational" },
    { id: "6pr6psm3s003", name: "Video (Broadcasting)", status: "operational" },
    { id: "ys9m23jjzpg0", name: "Purchases", status: "operational" },
  ],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
};

// --- service ----------------------------------------------------------------

/**
 * The whole reason this check names `.com`: `status.twitch.tv` 302-redirects to
 * `status.twitch.com`, and a check may only reach hosts it declares.
 */
Deno.test("service: calls status.twitch.com, the host it declares — not status.twitch.tv", async () => {
  assertEquals(new URL(STATUS_URL).hostname, "status.twitch.com");
  assertEquals(service.network?.allow, ["status.twitch.com"]);

  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  await service.check!({}, ctx);
  assertEquals(new URL(calls[0].url).hostname, "status.twitch.com");
});

Deno.test("service: an all-operational page is ok, with every component reported", async () => {
  const { ctx } = mockCtx([{ body: SUMMARY }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 6);
  assertEquals(report.components!["yz28x40y5mq2"].message, "Login");
});

Deno.test("service: the page indicator is the verdict, not the component roll-up", async () => {
  const { ctx } = mockCtx([{
    body: {
      ...SUMMARY,
      components: [{ id: "a", name: "Chat", status: "major_outage" }],
      status: { indicator: "minor", description: "Partially Degraded Service" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded", "component status overrode Twitch's own roll-up");
  assert(report.message!.includes("Chat (major_outage)"), report.message);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "gateway" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer identifies as Twitch's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: { ...SUMMARY, page: { name: "Somebody Else", url: "https://status.example.com" } },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("self-identifies"), report.message);
});

Deno.test("service: the Statuspage vocabulary maps as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");

  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Video (Watching)" }, 3), "video-watching-3");
});

// --- api-status (the declared absence) --------------------------------------

/**
 * `unknown` outranks `ok` in the roll-up, so a declared absence at any severity
 * but `informational` would pin this app at `unknown` forever.
 */
Deno.test("api-status: is a declared absence at informational severity", () => {
  assertEquals(typeof apiStatus.check, "undefined");
  assertEquals(apiStatus.severity, "informational");
  assert(apiStatus.unavailable!.reason.includes("no component for the Helix API"));
});

// --- api --------------------------------------------------------------------

/**
 * A JSON 401 in Twitch's documented shape is the PASS: it proves the request
 * reached Twitch's own application layer rather than a proxy.
 */
Deno.test("api: an unauthenticated JSON 401 is ok", async () => {
  const { ctx, calls } = mockCtx([
    { status: 401, body: helixError("Unauthorized", 401, "OAuth token is missing") },
  ]);
  const report = await api.check!({}, ctx);

  assertEquals(calls[0].url, PROBE_URL);
  // Unsigned by construction: nothing that could carry a credential is sent.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals("client-id" in calls[0].headers, false);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("OAuth token is missing"), report.message);
});

/** A 401 whose body is not Twitch's shape is a proxy, and proves nothing. */
Deno.test("api: a 401 that is not Twitch's JSON shape is unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "<html>Sign in to the network</html>",
    headers: { "content-type": "text/html" },
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("proxy"), report.message);
});

Deno.test("api: a 5xx is degraded and an unreachable host is unknown", async () => {
  const sick = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!({}, sick.ctx)).state, "degraded");

  // An empty queue makes the mock throw, standing in for a network failure.
  const dead = mockCtx([]);
  const report = await api.check!({}, dead.ctx);
  assertEquals(report.state, "unknown", "a local network failure was reported as a Twitch outage");
});

Deno.test("api: the Helix error-shape guard rejects near-misses", () => {
  assert(isHelixErrorShape({ error: "Unauthorized", status: 401, message: "x" }));
  assert(
    !isHelixErrorShape({ status: 401, message: "invalid access token" }),
    "id.twitch.tv shape",
  );
  assert(!isHelixErrorShape({ error: "Unauthorized" }));
  assert(!isHelixErrorShape("Unauthorized"));
  assert(!isHelixErrorShape(null));
});

// --- quota ------------------------------------------------------------------

const RATE_HEADERS = (limit: string, remaining: string, reset: string) => ({
  "content-type": "application/json",
  "ratelimit-limit": limit,
  "ratelimit-remaining": remaining,
  "ratelimit-reset": reset,
});

Deno.test("quota: reads the three headers off a cheap Helix call", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [] },
    headers: RATE_HEADERS("800", "799", "1781653392"),
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, QUOTA_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "points",
    limit: 800,
    remaining: 799,
    unit: "points",
    // `date -u -d @1781653392` → 2026-06-16T23:43:12+00:00. The header value is
    // the one from Twitch's own rate-limit example.
    resetAt: "2026-06-16T23:43:12.000Z",
  }]);
});

/**
 * `Ratelimit-Reset` is an epoch SECOND. Reading it as milliseconds puts the
 * reset in 1970; reading it as a duration puts it 56 years out.
 */
Deno.test("quota: Ratelimit-Reset is converted from epoch seconds", () => {
  assertEquals(
    readRateLimit(new Headers({ "ratelimit-reset": "1781653392" })).resetAt,
    "2026-06-16T23:43:12.000Z",
  );
  assertEquals(
    readRateLimit(new Headers({ "ratelimit-reset": "0" })).resetAt,
    "1970-01-01T00:00:00.000Z",
  );
  assertEquals(readRateLimit(new Headers()).resetAt, undefined);
  assertEquals(readRateLimit(new Headers({ "ratelimit-limit": "junk" })).limit, undefined);
});

Deno.test("quota: headroom thresholds", () => {
  assertEquals(stateFor({ limit: 800, remaining: 799 }).state, "ok");
  assertEquals(stateFor({ limit: 800, remaining: 160 }).state, "degraded");
  assertEquals(stateFor({ limit: 800, remaining: 40 }).state, "down");
  assertEquals(stateFor({ limit: 800, remaining: 0 }).state, "down");
});

/** Headers absent means "we learned nothing" — reporting ok would be the wrong lie. */
Deno.test("quota: a response without the headers is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, []);
});

Deno.test("quota: a 429 is itself the answer", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: helixError("Too Many Requests", 429, "slow down"),
    headers: RATE_HEADERS("800", "0", "1781653392"),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.quota![0].remaining, 0);
});

Deno.test("quota: a 401 says nothing about headroom, so it is unknown", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: helixError("Unauthorized", 401, "Invalid OAuth token") },
  ]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
