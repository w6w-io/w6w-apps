import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { ACCEPT, USER_AGENT } from "../../lib/client.ts";
import { errorBody, mockCtx, q, url } from "../_helpers.ts";

const RATE_HEADERS = {
  "content-type": "application/json",
  "x-ratelimit-limit": "5000",
  "x-ratelimit-remaining": "4993",
  "x-ratelimit-reset": "2026-08-11T04:00:00+00:00",
};

/**
 * A signed check must not widen egress — that pairing is banned precisely
 * because a widened host would then see the credential.
 */
Deno.test("quota: is a signed, connection-scoped check that widens no egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.network, undefined);
});

/**
 * `unknown` outranks `ok` in the roll-up, and this check reports `unknown`
 * whenever Vimeo omits the headers — measured to happen on an unauthenticated
 * call. At the default `degraded` severity that would pin the App's verdict at
 * `unknown` forever.
 */
Deno.test("quota: is informational, so an unknown cannot pin the app's verdict", () => {
  assertEquals(quota.severity, "informational");
});

/**
 * The probe is filtered for two reasons: Vimeo reports the headers as the
 * already-doubled field-filtering figure, and an unfiltered /me would carry
 * `preferences.videos.password`.
 */
Deno.test("quota: probes /me?fields=uri with the versioned Accept", async () => {
  const { ctx, calls } = mockCtx([{ headers: RATE_HEADERS, body: { uri: "/users/152184" } }]);
  await quota.check!({}, ctx);
  assertEquals(url(calls[0]).pathname, "/me");
  assertEquals(q(calls[0], "fields"), "uri");
  assertEquals(calls[0].headers.accept, ACCEPT);
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  // The credential is injected by `sign`, never built here.
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("quota: reports the reading and says the figure already assumes field filtering", async () => {
  const { ctx } = mockCtx([{ headers: RATE_HEADERS, body: { uri: "/users/152184" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "requests",
    limit: 5000,
    remaining: 4993,
    resetAt: "2026-08-11T04:00:00.000Z",
    unit: "requests",
  }]);
  assert(report.message?.includes("4993 of 5000"), report.message);
  assert(report.message?.includes("already assumes field filtering"), report.message);
});

/** Vimeo's window refills whole every 60 seconds, so a low reading is not a fault. */
Deno.test("quota: a nearly-exhausted allowance is still ok, not degraded", async () => {
  const { ctx } = mockCtx([{
    headers: { ...RATE_HEADERS, "x-ratelimit-remaining": "1" },
    body: { uri: "/users/152184" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 1);
});

/** 429 with error code 9000 is Vimeo actively refusing — that IS degraded. */
Deno.test("quota: a 429 reports degraded with zero remaining", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { ...RATE_HEADERS, "x-ratelimit-remaining": "0" },
    body: errorBody(9000, "Rate limit exceeded."),
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.quota?.[0].remaining, 0);
  assert(report.message?.includes("9000"), report.message);
  assert(report.message?.includes("2026-08-11T04:00:00.000Z"), report.message);
});

/**
 * Measured: a live unauthenticated api.vimeo.com response carried none of the
 * three headers. Reporting a number here would be inventing one.
 */
Deno.test("quota: no rate-limit headers means unknown, not a fabricated number", async () => {
  const { ctx } = mockCtx([{ body: { uri: "/users/152184" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
  assert(report.message?.includes("no X-RateLimit-* headers"), report.message);
});

/** Whether the credential itself is any good is the derived auth check's job. */
Deno.test("quota: a rejected credential is unknown here, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(8003, "nope") }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("401"), report.message);
});

Deno.test("quota: a partial reading still reports what Vimeo sent", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "application/json", "x-ratelimit-remaining": "12" },
    body: { uri: "/users/152184" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 12);
  assertEquals(report.quota?.[0].limit, undefined);
  assert(report.message?.includes("12 requests left"), report.message);
});
