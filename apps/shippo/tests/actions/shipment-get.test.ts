import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-get.ts";

Deno.test("shipment-get: reads GET /shipments/{id} and sorts rates numerically", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      object_id: "shp_1",
      status: "SUCCESS",
      rates: [{ object_id: "r1", amount: "10.05" }, { object_id: "r2", amount: "9.99" }],
    },
  }]);
  const result = await action.execute!({ shipmentId: "shp_1" }, ctx) as {
    rates: Array<{ object_id: string }>;
    cheapestRate: { object_id: string };
  };
  assertEquals(calls[0].url, "https://api.goshippo.com/shipments/shp_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.rates.map((r) => r.object_id), ["r2", "r1"]);
  assertEquals(result.cheapestRate.object_id, "r2");
});

Deno.test("shipment-get: `shipmentId` is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});

Deno.test("shipment-get: is read-only", () => {
  assertEquals(action.type, "read");
});
