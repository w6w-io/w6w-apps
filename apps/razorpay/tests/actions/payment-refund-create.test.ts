import { assertEquals } from "@std/assert";
import paymentRefundCreate from "../../actions/payment-refund-create.ts";
import { mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

/**
 * The whole point of this action: a runtime retry of a dropped connection
 * must not create a second real refund. `ctx.invocation.invocationId`
 * becomes `X-Refund-Idempotency`.
 */
Deno.test("payment-refund-create: sends the invocation id as X-Refund-Idempotency", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ body: { id: "rfnd_1", status: "processed" } }],
    "inv-abcdef0123",
  );
  await paymentRefundCreate.execute({ id: "pay_1", amount: 20000 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments/pay_1/refund");
  assertEquals(calls[0].headers["x-refund-idempotency"], "inv-abcdef0123");
  assertEquals(JSON.parse(calls[0].body!), { amount: 20000 });
});

Deno.test("payment-refund-create: omitting amount refunds the full payment — no amount key sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rfnd_1" } }]);
  await paymentRefundCreate.execute({ id: "pay_1" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals("x-refund-idempotency" in calls[0].headers, false);
});

Deno.test("payment-refund-create: is not idempotent at the action level — the header carries that instead", () => {
  assertEquals(paymentRefundCreate.idempotent, false);
});
