import { assertEquals } from "@std/assert";
import invoiceCancel from "../../actions/invoice-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-cancel: posts to /invoices/{id}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_1", status: "cancelled" } }]);
  const out = await invoiceCancel.execute({ id: "inv_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/invoices/inv_1/cancel");
  assertEquals(out, { id: "inv_1", status: "cancelled" });
});
