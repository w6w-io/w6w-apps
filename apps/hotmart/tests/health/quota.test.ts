import { assertEquals } from "@std/assert";
import quota, { readHeaders } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("readHeaders - prefers the modern RateLimit-* trio", () => {
  const headers = new Headers({
    "ratelimit-limit": "500",
    "ratelimit-remaining": "480",
    "ratelimit-reset": "42",
  });
  const out = readHeaders(headers);
  assertEquals(out.limit, 500);
  assertEquals(out.remaining, 480);
  assertEquals(typeof out.resetAt, "string");
});

Deno.test("readHeaders - falls back to the legacy X-RateLimit-*-Minute pair", () => {
  const headers = new Headers({
    "x-ratelimit-limit-minute": "500",
    "x-ratelimit-remaining-minute": "10",
  });
  const out = readHeaders(headers);
  assertEquals(out.limit, 500);
  assertEquals(out.remaining, 10);
});

Deno.test("readHeaders - returns an empty reading when no rate-limit headers are present", () => {
  assertEquals(readHeaders(new Headers()), {});
});

Deno.test("check - ok when headroom is comfortably above the warn fraction", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {},
    headers: { "ratelimit-limit": "500", "ratelimit-remaining": "490" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(pathOf(calls[0].url), "/user/api/v1/me");
});

Deno.test("check - degraded when remaining drops to the warn fraction", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "ratelimit-limit": "500", "ratelimit-remaining": "40" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("check - down when the limit is exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "ratelimit-limit": "500", "ratelimit-remaining": "0" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("check - unknown when the probe succeeds but carries no rate-limit headers", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check - unknown (never down) when the probe itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
