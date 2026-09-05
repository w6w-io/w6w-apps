import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/payment-refund.ts";

Deno.test("payment-refund: POSTs /payments/refund with the payment id and amount", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "p1" } }]);
  await action.execute({ paymentId: "p1", amount: 25 }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/payments/refund");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "p1");
  assertEquals(body.amount, 25);
});

Deno.test("payment-refund: an unset amount refunds the full payment", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "p1" } }]);
  await action.execute({ paymentId: "p1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).amount, undefined);
});
