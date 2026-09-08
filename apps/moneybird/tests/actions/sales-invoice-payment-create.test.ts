import { assertEquals } from "@std/assert";
import action from "../../actions/sales-invoice-payment-create.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("sales-invoice-payment-create: POSTs the non-deprecated .../payments.json endpoint", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 201, body: { id: "p1" } }]);
  await action.execute({ id: "i1", paymentDate: "2026-09-04", price: "363.0" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices/i1/payments.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    payment: { payment_date: "2026-09-04", price: "363.0" },
  });
});

Deno.test("sales-invoice-payment-create: never calls the deprecated register_payment path", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 201, body: {} }]);
  await action.execute({ id: "i1", paymentDate: "2026-09-04", price: "10.0" }, ctx);
  assertEquals(pathOf(calls[0].url).includes("register_payment"), false);
});

Deno.test("sales-invoice-payment-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
