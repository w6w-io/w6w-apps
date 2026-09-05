import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota, { readRate, WARN_FRACTION } from "../../health/quota.ts";

Deno.test("quota: reports ok headroom from a real-shaped response", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      rateLimits: [{
        apiContext: "buy",
        apiName: "browse",
        resources: [{
          name: "buy.browse",
          rates: [{ limit: 5000, remaining: 4900, count: 100, timeWindow: 86400 }],
        }],
      }],
    },
  }]);
  const result = await quota.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/developer/analytics/v1_beta/rate_limit/");
  assertEquals(url.searchParams.get("api_context"), "buy");
  assertEquals(url.searchParams.get("api_name"), "browse");
  assertEquals(result.state, "ok");
  assertEquals(result.quota?.length, 1);
  assertEquals(result.quota?.[0], {
    id: "buy:browse:buy.browse",
    limit: 5000,
    remaining: 4900,
    unit: "calls / 86400s",
  });
});

Deno.test("quota: degrades when a resource is near its limit", async () => {
  const { ctx } = mockCtx([{
    body: {
      rateLimits: [{
        apiContext: "buy",
        apiName: "browse",
        resources: [{ name: "buy.browse", rates: [{ limit: 5000, remaining: 100 }] }],
      }],
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("buy:browse:buy.browse"));
});

Deno.test("quota: goes down when a resource has zero calls remaining", async () => {
  const { ctx } = mockCtx([{
    body: {
      rateLimits: [{
        apiContext: "buy",
        apiName: "browse",
        resources: [{ name: "buy.browse", rates: [{ limit: 5000, remaining: 0 }] }],
      }],
    },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("quota: an OAuth-domain error is unknown, not degraded", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ domain: "OAuth", message: "Invalid access token" }] },
  }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("quota: a non-OAuth error is unknown with the status quoted", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message?.includes("500"));
});

Deno.test("quota: no known resources in the body is unknown", async () => {
  const { ctx } = mockCtx([{ body: { rateLimits: [] } }]);
  const result = await quota.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("readRate: a non-positive limit is ok, not exhausted", () => {
  assertEquals(readRate("x", { limit: 0, remaining: 0 }), {
    quota: { id: "x", limit: 0, remaining: 0, unit: "calls" },
    state: "ok",
  });
});

Deno.test("readRate: the warn threshold is exactly the boundary asserted elsewhere", () => {
  const limit = 1000;
  const remaining = limit * (1 - WARN_FRACTION);
  const reading = readRate("x", { limit, remaining });
  assertEquals(reading?.state, "degraded");
});

Deno.test("readRate: missing limit/remaining yields no reading", () => {
  assertEquals(readRate("x", {}), undefined);
});
