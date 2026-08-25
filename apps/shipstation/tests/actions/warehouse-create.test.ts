import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/warehouse-create.ts";

const originAddress = '{"name":"John Doe","address_line1":"4009 Marathon Blvd",' +
  '"city_locality":"Austin","state_province":"TX","postal_code":"78756","country_code":"US"}';

Deno.test("warehouse-create: posts to /v2/warehouses", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { warehouse_id: "se-1" } }]);
  const result = await action.execute!(
    { name: "East Warehouse", originAddress },
    ctx,
  ) as { warehouseId: string };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/warehouses");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "East Warehouse");
  assertEquals(body.origin_address.city_locality, "Austin");
  assertEquals(result.warehouseId, "se-1");
});

Deno.test("warehouse-create: requires name", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ originAddress }, ctx),
    Error,
    "name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("warehouse-create: requires originAddress", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ name: "East" }, ctx),
    Error,
    "originAddress",
  );
  assertEquals(calls.length, 0);
});
