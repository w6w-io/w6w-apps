import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-send.ts";

Deno.test("invoice-send: POSTs /invoices/bulk with action email and a one-element ids array", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: {} }]);
  await action.execute({ invoiceId: "inv1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/invoices/bulk");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { action: "email", ids: ["inv1"] });
});
