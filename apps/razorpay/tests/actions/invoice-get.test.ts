import { assertEquals } from "@std/assert";
import invoiceGet from "../../actions/invoice-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-get: fetches /invoices/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_1", status: "issued" } }]);
  const out = await invoiceGet.execute({ id: "inv_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/invoices/inv_1");
  assertEquals(out, { id: "inv_1", status: "issued" });
});
