import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-update.ts";

const shipTo = '{"name":"Amanda Miller","address_line1":"525 S Winchester Blvd",' +
  '"city_locality":"San Jose","state_province":"CA","postal_code":"95128","country_code":"US"}';
const updated = { status: 200, body: { shipment_id: "se-1", shipment_status: "pending" } };

Deno.test("shipment-update: PUTs to /v2/shipments/:id", async () => {
  const { ctx, calls } = mockCtx([updated]);
  await action.execute!({ shipmentId: "se-1", shipTo, warehouseId: "se-wh-1" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/se-1");
  assertEquals(calls[0].method, "PUT");
});

Deno.test("shipment-update: requires shipmentId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ shipTo, warehouseId: "se-wh-1" }, ctx),
    Error,
    "shipmentId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("shipment-update: requires shipTo", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "se-1", warehouseId: "se-wh-1" }, ctx),
    Error,
    "shipTo",
  );
  assertEquals(calls.length, 0);
});

Deno.test("shipment-update: requires shipFrom or warehouseId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "se-1", shipTo }, ctx),
    Error,
    "warehouseId",
  );
  assertEquals(calls.length, 0);
});
