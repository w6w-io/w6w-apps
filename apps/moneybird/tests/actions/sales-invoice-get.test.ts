import { assertEquals } from "@std/assert";
import action from "../../actions/sales-invoice-get.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("sales-invoice-get: GETs /sales_invoices/:id.json", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: { id: "i1", state: "open" } }]);
  const out = await action.execute({ id: "i1" }, ctx) as { state: string };
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices/i1.json");
  assertEquals(out.state, "open");
});
