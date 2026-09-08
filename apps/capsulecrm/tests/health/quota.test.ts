import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: is a signed, informational, connection-scoped check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reads X-RateLimit-* headers off /users/current", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { user: { id: 1 } },
    headers: {
      "x-ratelimit-limit": "4000",
      "x-ratelimit-remaining": "3944",
      "x-ratelimit-reset": "1434037662",
    },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/users/current");
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0], {
    id: "user",
    limit: 4000,
    remaining: 3944,
    unit: "requests",
    resetAt: new Date(1434037662 * 1000).toISOString(),
  });
});

Deno.test("quota: remaining below 10% of limit reports degraded", async () => {
  const { ctx } = mockCtx([{
    body: { user: {} },
    headers: { "x-ratelimit-limit": "4000", "x-ratelimit-remaining": "50" },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: exhausted (0 remaining) reports down", async () => {
  const { ctx } = mockCtx([{
    body: { user: {} },
    headers: { "x-ratelimit-limit": "4000", "x-ratelimit-remaining": "0" },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: no X-RateLimit-* headers reports unknown, not a guess", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { user: {} }, headers: {} }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("quota: a failed probe reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
