import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/salesorder-get.ts";

Deno.test("salesorder-get: GETs /salesorders/{id} and unwraps the singular `salesorder`", async () => {
  const { ctx, calls } = mockInventoryCtx([
    {
      body: {
        code: 0,
        message: "success",
        salesorder: { salesorder_id: "1", line_items: [{ item_id: "9", quantity: 2 }] },
      },
    },
  ]);
  const out = await action.execute({ recordId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/salesorders/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(out, { salesorder_id: "1", line_items: [{ item_id: "9", quantity: 2 }] });
});
