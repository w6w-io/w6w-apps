import { assert, assertEquals } from "@std/assert";
import quota, { WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: ok with the full window when comfortably under the warn threshold", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: 1 } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "50",
      "x-ratelimit-remaining": "40",
      "x-ratelimit-reset": "1735689600",
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/users/who_am_i.json");
  assertEquals(result.state, "ok");
  assertEquals(result.quota?.[0].limit, 50);
  assertEquals(result.quota?.[0].remaining, 40);
  assertEquals(result.quota?.[0].resetAt, new Date(1735689600 * 1000).toISOString());
});

Deno.test(`quota: degraded at or above ${WARN_FRACTION * 100}% consumed`, async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "50",
      "x-ratelimit-remaining": "4",
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("4/50"), result.message);
});

Deno.test("quota: degraded, not down, when the window is fully exhausted", async () => {
  const { ctx } = mockCtx([{
    body: {},
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "50",
      "x-ratelimit-remaining": "0",
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("exhausted"), result.message);
});

/**
 * Measured live on 2026-08-24: an unauthenticated 401 carries NONE of the
 * three X-RateLimit-* headers. This must read as "cannot tell", not as a
 * healthy full window and not as exhausted.
 */
Deno.test("quota: unknown on a 401 — rate-limit headers are scoped to a live token", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "application/json" } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: unknown when the response is ok but carries no rate-limit headers", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: unknown on any other non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: declares connection scope and a signed credential posture", () => {
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.kind, "quota");
});
