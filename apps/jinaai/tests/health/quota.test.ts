import { assertEquals } from "@std/assert";
import quota, { LOW_REQUESTS_THRESHOLD, LOW_TOKENS_THRESHOLD } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: unknown when Jina AI sends neither rate-limit header", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/batches");
  assertEquals(report.state, "unknown");
});

Deno.test("quota: ok with comfortable headroom on both buckets", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-ratelimit-remaining-requests": "480",
      "x-ratelimit-remaining-tokens": "950000",
    },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [
    { id: "requests", remaining: 480, unit: "requests" },
    { id: "tokens", remaining: 950000, unit: "tokens" },
  ]);
});

Deno.test("quota: degraded when remaining requests is at/under the low threshold", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-ratelimit-remaining-requests": String(LOW_REQUESTS_THRESHOLD),
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: degraded when remaining tokens is at/under the low threshold", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-ratelimit-remaining-tokens": String(LOW_TOKENS_THRESHOLD),
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});
