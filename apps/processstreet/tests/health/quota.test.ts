import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: is a signed, informational, connection-scoped check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reads X-Api-Key-Rate-Limit-* headers off /testAuth", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { apiKeyLabel: "My Key" },
    headers: {
      "x-api-key-rate-limit-limit": "2500",
      "x-api-key-rate-limit-remaining": "2499",
      "x-api-key-rate-limit-reset": "1788725084",
    },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/testAuth");
  assertEquals(r.state, "ok");
  assertEquals(r.quota?.[0], {
    id: "api-key",
    limit: 2500,
    remaining: 2499,
    unit: "requests",
    resetAt: new Date(1788725084 * 1000).toISOString(),
  });
});

Deno.test("quota: remaining below 10% of limit reports degraded", async () => {
  const { ctx } = mockCtx([{
    body: { apiKeyLabel: "k" },
    headers: { "x-api-key-rate-limit-limit": "2500", "x-api-key-rate-limit-remaining": "50" },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "degraded");
});

Deno.test("quota: exhausted (0 remaining) reports down", async () => {
  const { ctx } = mockCtx([{
    body: { apiKeyLabel: "k" },
    headers: { "x-api-key-rate-limit-limit": "2500", "x-api-key-rate-limit-remaining": "0" },
  }]);
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

Deno.test("quota: no X-Api-Key-Rate-Limit-* headers reports unknown, not a guess", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { apiKeyLabel: "k" }, headers: {} }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("quota: still reads headers off a 401 (verified: even a bad key carries them)", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unable to verify credentials." },
    headers: { "x-api-key-rate-limit-limit": "2500", "x-api-key-rate-limit-remaining": "2499" },
  }]);
  const r = await quota.check!({}, ctx);
  assertEquals(r.state, "ok");
});

Deno.test("quota: a failed (non-401) probe reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
