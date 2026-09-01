import { assertEquals } from "@std/assert";
import paymentCancel from "../../actions/payment-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-cancel: sends DELETE to /payments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tr_1", status: "canceled" } }]);
  const out = await paymentCancel.execute({ paymentId: "tr_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { id: "tr_1", status: "canceled" });
});

Deno.test("payment-cancel: is idempotent — a canceled payment stays canceled", () => {
  assertEquals(paymentCancel.idempotent, true);
});
