import { assertEquals } from "@std/assert";
import rateLimit, { PROBE_PATH } from "../../health/rate-limit.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rate-limit: probes GET /v2/users/me — the same call the auth test uses", () => {
  assertEquals(PROBE_PATH, "/users/me");
  assertEquals(rateLimit.credential, "signed");
  assertEquals(rateLimit.scope, "connection");
});

Deno.test("rate-limit: healthy headroom reports ok with a HealthQuota entry", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {},
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "32768",
        "x-ratelimit-remaining": "32000",
        "x-ratelimit-reset": "1432447070",
      },
    },
  ]);
  const report = await rateLimit.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 32768);
  assertEquals(report.quota?.[0].remaining, 32000);
  assertEquals(report.quota?.[0].resetAt, new Date(1432447070 * 1000).toISOString());
});

Deno.test("rate-limit: near-exhausted headroom reports degraded, never down", async () => {
  const { ctx } = mockCtx([
    {
      body: {},
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "1000",
        "x-ratelimit-remaining": "10",
        "x-ratelimit-reset": "1432447070",
      },
    },
  ]);
  const report = await rateLimit.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("rate-limit: exhausted headroom (0 remaining) reports degraded, not down — it recovers", async () => {
  const { ctx } = mockCtx([
    {
      body: {},
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "1000",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1432447070",
      },
    },
  ]);
  const report = await rateLimit.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("rate-limit: a response with no X-Ratelimit-* headers reports unknown", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "content-type": "application/json" } }]);
  const report = await rateLimit.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("rate-limit: a non-ok response reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await rateLimit.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
