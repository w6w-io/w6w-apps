import { assert, assertEquals } from "@std/assert";
import quota, { readRateLimitHeaders, stateFor, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("readRateLimitHeaders: reads all three headers and converts the reset to ISO", () => {
  const headers = new Headers({
    "x-ratelimit-limit": "600",
    "x-ratelimit-remaining": "599",
    "x-ratelimit-reset": "1893456000",
  });
  const reading = readRateLimitHeaders(headers);
  assertEquals(reading.limit, 600);
  assertEquals(reading.remaining, 599);
  assertEquals(reading.resetAt, new Date(1893456000 * 1000).toISOString());
});

Deno.test("readRateLimitHeaders: absent headers are undefined, not NaN or zero", () => {
  const reading = readRateLimitHeaders(new Headers());
  assertEquals(reading.limit, undefined);
  assertEquals(reading.remaining, undefined);
  assertEquals(reading.resetAt, undefined);
});

Deno.test("stateFor: no reading at all is unknown", () => {
  assertEquals(stateFor({}).state, "unknown");
});

Deno.test("stateFor: comfortable headroom is ok", () => {
  assertEquals(stateFor({ limit: 600, remaining: 500 }).state, "ok");
});

Deno.test(`stateFor: at or above ${WARN_FRACTION * 100}% used is degraded`, () => {
  const result = stateFor({ limit: 600, remaining: 50 });
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("%"));
});

Deno.test("stateFor: fully exhausted is degraded, not down — the limit resets on its own", () => {
  const result = stateFor({ limit: 600, remaining: 0 });
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("exhausted"));
});

Deno.test("stateFor: a non-positive limit is treated as unmetered, not exhausted", () => {
  assertEquals(stateFor({ limit: 0, remaining: 0 }).state, "ok");
});

Deno.test("quota: reads headers off GET /programs/ — the same probe auth/api-key.ts uses", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [{ id: "p1" }],
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "600",
        "x-ratelimit-remaining": "599",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/programs/");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], { id: "requests", limit: 600, remaining: 599, unit: "requests" });
});

Deno.test("quota: missing rate-limit headers on an otherwise-successful call is unknown", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("did not return"));
});

Deno.test("quota: a non-2xx call is unknown, not degraded — it says nothing about headroom", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: declares connection scope and a signed credential posture", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
});
