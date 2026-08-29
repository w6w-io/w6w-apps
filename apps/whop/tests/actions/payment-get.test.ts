import { assert, assertEquals } from "@std/assert";
import paymentGet from "../../actions/payment-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-get: GETs /payments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1", status: "paid" } }]);
  const out = await paymentGet.execute({ paymentId: "pay_1" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/payments/pay_1");
  assertEquals(out.id, "pay_1");
});

Deno.test("payment-get: strips client_secret — a buyer-facing checkout credential, not a report field", async () => {
  const { ctx } = mockCtx([
    { body: { id: "pay_1", client_secret: "pay_1_secret_v1_xxxx", amount: 10 } },
  ]);
  const out = await paymentGet.execute({ paymentId: "pay_1" }, ctx) as Record<string, unknown>;
  assert(!("client_secret" in out));
  assertEquals(out.amount, 10);
});
