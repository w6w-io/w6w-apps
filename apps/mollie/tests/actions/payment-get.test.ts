import { assertEquals } from "@std/assert";
import paymentGet from "../../actions/payment-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-get: fetches /payments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tr_1", status: "paid" } }]);
  const out = await paymentGet.execute({ paymentId: "tr_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "tr_1", status: "paid" });
});
