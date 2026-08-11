import { assertEquals } from "@std/assert";
import metricMetadataGet from "../../actions/metric-metadata-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("metric-metadata-get: calls GET /api/v1/metrics/{name}", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "gauge", unit: "percent" } }]);
  const out = await metricMetadataGet.execute({ metricName: "system.cpu.user" }, ctx) as {
    type: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/metrics/system.cpu.user");
  assertEquals(out.type, "gauge");
});

/**
 * A metric name arrives from a form, so a pasted scope must not be able to
 * change the request path.
 */
Deno.test("metric-metadata-get: a pasted scope is escaped into the segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await metricMetadataGet.execute({ metricName: "system.cpu.user{host:x}/../org" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/metrics/system.cpu.user%7Bhost%3Ax%7D%2F..%2Forg");
});
