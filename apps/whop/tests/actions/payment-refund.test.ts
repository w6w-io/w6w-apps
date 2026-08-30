import { assert, assertEquals } from "@std/assert";
import paymentRefund from "../../actions/payment-refund.ts";
import { mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("payment-refund: POSTs a partial amount", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1", status: "refunded" } }]);
  await paymentRefund.execute({ paymentId: "pay_1", partialAmount: 6.9 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/payments/pay_1/refund");
  assertEquals(JSON.parse(calls[0].body!), { partial_amount: 6.9 });
});

Deno.test("payment-refund: an absent partialAmount refunds the full payment (empty body)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1" } }]);
  await paymentRefund.execute({ paymentId: "pay_1" }, ctx);
  assertEquals(calls[0].body, "{}");
});

Deno.test("payment-refund: sends the runtime's invocationId as Idempotency-Key", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: { id: "pay_1" } }], "inv-refund");
  await paymentRefund.execute({ paymentId: "pay_1" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-refund");
});

Deno.test("payment-refund: strips client_secret from the refunded payment", async () => {
  const { ctx } = mockCtx([{ body: { id: "pay_1", client_secret: "leak" } }]);
  const out = await paymentRefund.execute({ paymentId: "pay_1" }, ctx) as Record<string, unknown>;
  assert(!("client_secret" in out));
});
