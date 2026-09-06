import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockBooqableCtx, mockCtx } from "../_helpers.ts";

Deno.test("quota: is an informational, connection-scoped, signed quota check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  assertEquals(quota.covers, ["*"]);
  assertEquals(quota.network, undefined);
});

Deno.test("quota: reads restrictions.api_monthly_calls and api_usage_count", async () => {
  const { ctx, calls } = mockBooqableCtx([{
    body: {
      data: {
        attributes: {
          subscription: {
            api_usage_count: 900000,
            restrictions: {
              api_monthly_calls: 1000000,
              rate_limit_max: 250,
              rate_limit_period: 60,
            },
          },
        },
      },
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{
    id: "monthly_api_calls",
    limit: 1000000,
    remaining: 100000,
    unit: "requests",
  }]);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("extra_fields[companies]"), "subscription");
  assertEquals(url.searchParams.get("fields[companies]"), "subscription");
});

Deno.test("quota: degraded under 10% headroom, down at zero", async () => {
  const low = mockBooqableCtx([{
    body: {
      data: {
        attributes: {
          subscription: { api_usage_count: 999000, restrictions: { api_monthly_calls: 1000000 } },
        },
      },
    },
  }]);
  assertEquals((await quota.check!({}, low.ctx)).state, "degraded");

  const none = mockBooqableCtx([{
    body: {
      data: {
        attributes: {
          subscription: { api_usage_count: 1000000, restrictions: { api_monthly_calls: 1000000 } },
        },
      },
    },
  }]);
  assertEquals((await quota.check!({}, none.ctx)).state, "down");
});

Deno.test("quota: unknown when the response carries no usable numbers", async () => {
  const { ctx } = mockBooqableCtx([{ body: { data: { attributes: {} } } }]);
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});

Deno.test("quota: unknown when the connection records no company slug", async () => {
  const { ctx } = mockCtx();
  assertEquals((await quota.check!({}, ctx)).state, "unknown");
});
