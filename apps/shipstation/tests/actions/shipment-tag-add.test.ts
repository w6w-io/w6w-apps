import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-tag-add.ts";

Deno.test("shipment-tag-add: posts to /v2/shipments/:id/tags/:tag_name", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { shipment_id: "se-1", tag: { name: "east_warehouse" } } },
  ]);
  const result = await action.execute!(
    { shipmentId: "se-1", tagName: "east_warehouse" },
    ctx,
  ) as { shipmentId: string; tagName: string };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments/se-1/tags/east_warehouse");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.shipmentId, "se-1");
  assertEquals(result.tagName, "east_warehouse");
});

Deno.test("shipment-tag-add: requires shipmentId and tagName", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ tagName: "x" }, ctx),
    Error,
    "shipmentId",
  );
  await assertRejects(
    async () => await action.execute!({ shipmentId: "se-1" }, ctx),
    Error,
    "tagName",
  );
  assertEquals(calls.length, 0);
});
