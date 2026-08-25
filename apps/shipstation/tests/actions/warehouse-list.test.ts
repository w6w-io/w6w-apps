import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/warehouse-list.ts";

Deno.test("warehouse-list: GETs /v2/warehouses", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { warehouses: [{ warehouse_id: "se-1", name: "East" }] } },
  ]);
  const result = await action.execute!({}, ctx) as { warehouses: unknown[] };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/warehouses");
  assertEquals(result.warehouses.length, 1);
});
