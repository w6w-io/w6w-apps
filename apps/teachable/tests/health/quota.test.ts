import { assert, assertEquals } from "@std/assert";
import quota, { QUOTA_URL, readRateLimitHeaders } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: reads the same cheap probe as the auth check, signed, on the app's own host", () => {
  assertEquals(QUOTA_URL, "https://developers.teachable.com/v1/courses?per=1");
  assertEquals(quota.credential, "signed");
  // A signed check must not widen egress — that pairing is banned by the spec.
  assertEquals(quota.network, undefined);
});

Deno.test("quota: headroom well above the warning threshold reports ok", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { courses: [] },
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "100",
        "ratelimit-remaining": "80",
        "ratelimit-reset": "12",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, QUOTA_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "requests-per-minute",
    limit: 100,
    remaining: 80,
    unit: "requests",
  }]);
});

Deno.test("quota: remaining at or below the warning fraction reports degraded and names itself", async () => {
  const { ctx } = mockCtx([
    {
      body: { courses: [] },
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "100",
        "ratelimit-remaining": "5",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/5\/100 requests remaining/.test(report.message ?? ""), report.message);
});

/**
 * A live 429 IS the headroom answer, not a generic failure — this check reads
 * it directly rather than throwing, unlike an ordinary action.
 */
Deno.test("quota: a live 429 reports down", async () => {
  const { ctx } = mockCtx([
    {
      status: 429,
      body: { message: "API rate limit exceeded" },
      headers: {
        "content-type": "application/json",
        "ratelimit-limit": "100",
        "ratelimit-remaining": "0",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/rate-limiting/i.test(report.message ?? ""), report.message);
  assertEquals(report.quota?.[0].remaining, 0);
});

/**
 * The vendor only documents these headers on a 429 — this is the honest
 * behaviour when an ordinary 200 does not carry them, rather than a fabricated
 * `ok`.
 */
Deno.test("quota: headers absent on a 200 reports unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: { courses: [] } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/did not send RateLimit-\* headers/.test(report.message ?? ""), report.message);
});

Deno.test("readRateLimitHeaders: parses the three headers, tolerating any subset being absent", () => {
  const headers = new Headers({ "ratelimit-limit": "100", "ratelimit-remaining": "42" });
  assertEquals(readRateLimitHeaders(headers), {
    limit: 100,
    remaining: 42,
    resetSeconds: undefined,
  });
  assertEquals(readRateLimitHeaders(new Headers()), {
    limit: undefined,
    remaining: undefined,
    resetSeconds: undefined,
  });
});
