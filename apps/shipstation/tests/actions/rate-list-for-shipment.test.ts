import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rate-list-for-shipment.ts";

Deno.test("rate-list-for-shipment: GETs /v2/shipments/:id/rates", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ shipmentId: "se-1" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/se-1/rates");
  assertEquals(calls[0].method, "GET");
});

Deno.test("rate-list-for-shipment: flattens rates across every rate-result entry, sorted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [
      { shipment_id: "se-1", rates: [{ rate_id: "r1", shipping_amount: { amount: 10 } }] },
      { shipment_id: "se-1", rates: [{ rate_id: "r2", shipping_amount: { amount: 5 } }] },
    ],
  }]);
  const result = await action.execute!({ shipmentId: "se-1" }, ctx) as {
    rates: Array<{ rate_id: string }>;
    cheapestRate: { rate_id: string };
  };
  assertEquals(result.rates.map((r) => r.rate_id), ["r2", "r1"]);
  assertEquals(result.cheapestRate.rate_id, "r2");
});

Deno.test("rate-list-for-shipment: requires shipmentId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});
