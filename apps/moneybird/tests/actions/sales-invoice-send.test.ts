import { assertEquals } from "@std/assert";
import action from "../../actions/sales-invoice-send.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("sales-invoice-send: PATCHes .../send_invoice.json with an empty body by default", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: { id: "i1", state: "open" } }]);
  await action.execute({ id: "i1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices/i1/send_invoice.json");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("sales-invoice-send: wraps overrides under sales_invoice_sending", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: {} }]);
  await action.execute({
    id: "i1",
    deliveryMethod: "Email",
    emailAddress: "alt@example.com",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    sales_invoice_sending: { delivery_method: "Email", email_address: "alt@example.com" },
  });
});

Deno.test("sales-invoice-send: is not idempotent — retrying re-sends the email", () => {
  assertEquals(action.idempotent, false);
});
