import { assertEquals } from "@std/assert";
import quota, { parseRateLimitHeader } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("parseRateLimitHeader: parses the quoted policy name and key=number fields", () => {
  assertEquals(
    parseRateLimitHeader('"get-v2-payments";r=15;t=2;mollie-burst=60'),
    { policy: "get-v2-payments", fields: { r: 15, t: 2, "mollie-burst": 60 } },
  );
  assertEquals(
    parseRateLimitHeader('"get-v2-payments";q=20;w=3;mollie-burst=60'),
    { policy: "get-v2-payments", fields: { q: 20, w: 3, "mollie-burst": 60 } },
  );
});

Deno.test("check: no RateLimit header reports unknown, not down — the rollout may not have reached this account", async () => {
  const { ctx } = mockCtx([{ body: { id: "pfl_1" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: plenty of remaining budget reports ok with a quota reading", async () => {
  const { ctx } = mockCtx([{
    body: { id: "pfl_1" },
    headers: {
      "content-type": "application/json",
      ratelimit: '"get-v2-profiles";r=18;t=1;mollie-burst=60',
      "ratelimit-policy": '"get-v2-profiles";q=20;w=3;mollie-burst=60',
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0], {
    id: "get-v2-profiles",
    limit: 20,
    remaining: 18,
    unit: "requests/s",
  });
});

Deno.test("check: an exhausted bucket reports degraded, never down (it recovers on its own)", async () => {
  const { ctx } = mockCtx([{
    body: { id: "pfl_1" },
    headers: {
      "content-type": "application/json",
      ratelimit: '"get-v2-profiles";r=0;t=1;mollie-burst=0',
      "ratelimit-policy": '"get-v2-profiles";q=20;w=3;mollie-burst=60',
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});
