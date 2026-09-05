import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: is a signed, connection-scoped, informational check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reports ok with plenty of headroom, parsing Go-style durations", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit-requests": "14400",
      "x-ratelimit-remaining-requests": "14370",
      "x-ratelimit-limit-tokens": "18000",
      "x-ratelimit-remaining-tokens": "17997",
      "x-ratelimit-reset-requests": "2m59.56s",
      "x-ratelimit-reset-tokens": "7.66s",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/models");
  assertEquals(report.state, "ok");
  const requests = report.quota?.find((q) => q.id === "requests");
  const tokens = report.quota?.find((q) => q.id === "tokens");
  assertEquals(requests?.limit, 14400);
  assertEquals(requests?.remaining, 14370);
  assertEquals(tokens?.limit, 18000);
  assertEquals(tokens?.remaining, 17997);
  // resetAt is derived from a relative Go duration, so just assert it parsed
  // into a real future ISO timestamp rather than pinning an exact value.
  assertEquals(typeof requests?.resetAt, "string");
  assertEquals(new Date(requests!.resetAt!).getTime() > Date.now(), true);
});

Deno.test("quota: reports down when a bucket is fully exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit-tokens": "18000",
      "x-ratelimit-remaining-tokens": "0",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: reports degraded under 10% remaining", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit-requests": "100",
      "x-ratelimit-remaining-requests": "5",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports unknown when the probe itself fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "bad key" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reports unknown when no rate-limit headers are present at all", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
