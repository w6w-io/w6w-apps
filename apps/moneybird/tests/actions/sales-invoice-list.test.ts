import { assertEquals } from "@std/assert";
import action from "../../actions/sales-invoice-list.ts";
import { mockMoneybirdCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sales-invoice-list: GETs /sales_invoices.json with the filter passed through verbatim", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: [{ id: "i1" }] }]);
  const out = await action.execute({ filter: "state:open,period:this_month" }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices.json");
  assertEquals(queryOf(calls[0].url), { filter: "state:open,period:this_month" });
  assertEquals(out.items, [{ id: "i1" }]);
});

Deno.test("sales-invoice-list: no filter means no filter param — the vendor's own default applies", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
