import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-mark-paid.ts";

Deno.test("invoice-mark-paid: POSTs /invoices/bulk with action mark_paid", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: {} }]);
  await action.execute({ invoiceId: "inv1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/invoices/bulk");
  assertEquals(JSON.parse(calls[0].body!), { action: "mark_paid", ids: ["inv1"] });
});
