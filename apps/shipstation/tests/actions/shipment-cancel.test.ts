import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-cancel.ts";

Deno.test("shipment-cancel: GETs the /cancel path (not POST/DELETE)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ shipmentId: "se-1" }, ctx) as { cancelled: boolean };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/se-1/cancel");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.cancelled, true);
});

Deno.test("shipment-cancel: requires shipmentId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});
