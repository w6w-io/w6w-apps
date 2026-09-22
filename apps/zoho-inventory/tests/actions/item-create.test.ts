import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/item-create.ts";

Deno.test("item-create: POSTs /items with name and the documented optional fields", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", item: { item_id: "1" } } },
  ]);
  const out = await action.execute({
    fields: {
      name: "Hard Drive",
      rate: 120,
      sku: "HD-500",
      item_type: "sales",
      product_type: "goods",
    },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/items");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Hard Drive",
    rate: 120,
    sku: "HD-500",
    item_type: "sales",
    product_type: "goods",
  });
  assertEquals(out, { item_id: "1" });
});

Deno.test("item-create: `name` alone is a valid body — nothing else is required", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", item: { item_id: "1" } } },
  ]);
  await action.execute({ fields: { name: "Consulting" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Consulting" });
});
