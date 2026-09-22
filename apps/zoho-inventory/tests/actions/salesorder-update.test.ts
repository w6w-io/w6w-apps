import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/salesorder-update.ts";

Deno.test("salesorder-update: PUTs /salesorders/{id} with the fields to change", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", salesorder: { salesorder_id: "1" } } },
  ]);
  const out = await action.execute({
    recordId: "1",
    fields: { line_items: [{ item_id: "i1", quantity: 5 }] },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/salesorders/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { line_items: [{ item_id: "i1", quantity: 5 }] });
  assertEquals(out, { salesorder_id: "1" });
});

Deno.test("salesorder-update: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
