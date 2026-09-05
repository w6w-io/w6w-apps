import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: reads the X-PCO-API-Request-Rate-* headers", async () => {
  const { ctx } = mockCtx([
    {
      body: { data: { id: "1" } },
      headers: {
        "content-type": "application/json",
        "x-pco-api-request-rate-limit": "100",
        "x-pco-api-request-rate-count": "18",
        "x-pco-api-request-rate-period": "20 seconds",
      },
    },
  ]);
  const out = await quota.check!({}, ctx);

  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "requests", limit: 100, remaining: 82, unit: "requests" }]);
});

Deno.test("quota: missing rate-limit headers report unknown, not a fabricated number", async () => {
  const { ctx } = mockCtx([{
    body: { data: { id: "1" } },
    headers: { "content-type": "application/json" },
  }]);
  const out = await quota.check!({}, ctx);

  assertEquals(out.state, "unknown");
});

Deno.test("quota: declared informational — a headroom check should never fail an App verdict", () => {
  assertEquals(quota.severity, "informational");
});
