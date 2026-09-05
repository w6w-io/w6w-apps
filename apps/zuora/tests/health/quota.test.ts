import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports the per-minute window parsed out of ratelimit-limit", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "2250000, 50000;w=60, 2250000;w=3600, 27000000;w=86400",
      "ratelimit-remaining": "49500",
      "ratelimit-reset": "30",
    },
  }], { display: { region: "us-cloud2" } });

  const report = await quota.check!({}, ctx);
  assertEquals(calls[0].url, "https://rest.zuora.com/object-query/accounts?pageSize=1");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 50000);
  assertEquals(report.quota?.[0].remaining, 49500);
});

Deno.test("quota: degrades when remaining headroom drops under 5%", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [] },
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "50000;w=60",
      "ratelimit-remaining": "100",
      "ratelimit-reset": "10",
    },
  }], { display: { region: "us-cloud2" } });

  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: reports unknown when Zuora omits the rate-limit headers", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] }, headers: {} }], {
    display: { region: "us-cloud2" },
  });
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is informational severity — a low count is never itself a fatal verdict", () => {
  assertEquals(quota.severity, "informational");
});
