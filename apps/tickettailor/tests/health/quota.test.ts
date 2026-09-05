import { assertEquals } from "@std/assert";
import quota, { parseRateLimitHeaders, WARN_FRACTION } from "../../health/quota.ts";
import { OVERVIEW_URL } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("parseRateLimitHeaders: reads the three X-Rate-Limit-* headers", () => {
  const headers = new Headers({
    "x-rate-limit-limit": "10000",
    "x-rate-limit-remaining": "9995",
    "x-rate-limit-reset": "1465",
  });
  assertEquals(parseRateLimitHeaders(headers), {
    limit: 10000,
    remaining: 9995,
    resetSeconds: 1465,
  });
});

Deno.test("parseRateLimitHeaders: undefined when headers are absent", () => {
  assertEquals(parseRateLimitHeaders(new Headers()), {
    limit: undefined,
    remaining: undefined,
    resetSeconds: undefined,
  });
});

Deno.test("check: ok with plenty of headroom", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { box_office_name: "Acme" },
      headers: {
        "content-type": "application/json",
        "x-rate-limit-limit": "10000",
        "x-rate-limit-remaining": "9995",
        "x-rate-limit-reset": "60",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(calls[0].url, OVERVIEW_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 10000);
  assertEquals(report.quota?.[0].remaining, 9995);
});

Deno.test(`check: degraded at or above the ${WARN_FRACTION * 100}% warn threshold`, async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {},
      headers: {
        "content-type": "application/json",
        "x-rate-limit-limit": "1000",
        "x-rate-limit-remaining": "50",
        "x-rate-limit-reset": "10",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("check: unknown, not fabricated, when the headers are absent", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.quota, undefined);
});

Deno.test("check: unknown on a non-ok response — credential liveness is a separate check", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
