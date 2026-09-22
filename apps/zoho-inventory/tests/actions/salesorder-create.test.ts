import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/salesorder-create.ts";

Deno.test("salesorder-create: POSTs /salesorders with nested line_items", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", salesorder: { salesorder_id: "1" } } },
  ]);
  const out = await action.execute({
    fields: {
      customer_id: "982000000000123",
      line_items: [
        { item_id: "982000000000456", quantity: 2 },
        { item_id: "982000000000457", quantity: 1, rate: 45 },
      ],
    },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/salesorders");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    customer_id: "982000000000123",
    line_items: [
      { item_id: "982000000000456", quantity: 2 },
      { item_id: "982000000000457", quantity: 1, rate: 45 },
    ],
  });
  assertEquals(out, { salesorder_id: "1" });
});

Deno.test("salesorder-create: the line_items array survives JSON encoding intact", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", salesorder: { salesorder_id: "1" } } },
  ]);
  await action.execute({
    fields: { customer_id: "c1", line_items: [{ item_id: "i1", quantity: 3 }] },
  }, ctx);
  const parsed = JSON.parse(calls[0].body!) as { line_items: Array<Record<string, unknown>> };
  assertEquals(Array.isArray(parsed.line_items), true);
  assertEquals(parsed.line_items[0].quantity, 3);
});
