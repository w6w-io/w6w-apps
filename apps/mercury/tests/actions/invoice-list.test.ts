import { assertEquals } from "@std/assert";
import invoiceList from "../../actions/invoice-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-list: GETs /ar/invoices", async () => {
  const { ctx, calls } = mockCtx([{ body: { invoices: [{ id: "inv_1" }], page: {} } }]);
  const out = await invoiceList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/ar/invoices");
  assertEquals((out.items as unknown[]).length, 1);
});
