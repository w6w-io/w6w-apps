import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-get.ts";

const shipment = { status: 200, body: { shipment_id: "se-1", shipment_status: "pending" } };

Deno.test("shipment-get: fetches by shipmentId", async () => {
  const { ctx, calls } = mockCtx([shipment]);
  const result = await action.execute!({ shipmentId: "se-1" }, ctx) as { shipmentId: string };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/se-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.shipmentId, "se-1");
});

Deno.test("shipment-get: fetches by externalShipmentId on a different path", async () => {
  const { ctx, calls } = mockCtx([shipment]);
  await action.execute!({ externalShipmentId: "ext-1" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/external_shipment_id/ext-1");
});

Deno.test("shipment-get: prefers shipmentId when both are given", async () => {
  const { ctx, calls } = mockCtx([shipment]);
  await action.execute!({ shipmentId: "se-1", externalShipmentId: "ext-1" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/se-1");
});

Deno.test("shipment-get: requires one of shipmentId or externalShipmentId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});
