import { assertEquals } from "@std/assert";
import paymentUpdate from "../../actions/payment-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-update: patches only notes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pay_1", notes: { a: "b" } } }]);
  await paymentUpdate.execute({ id: "pay_1", notes: { a: "b" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments/pay_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { notes: { a: "b" } });
});
