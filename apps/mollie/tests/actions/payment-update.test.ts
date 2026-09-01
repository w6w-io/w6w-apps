import { assertEquals } from "@std/assert";
import paymentUpdate from "../../actions/payment-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-update: patches only the fields given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tr_1", status: "open" } }]);
  await paymentUpdate.execute({ paymentId: "tr_1", description: "New description" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payments/tr_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { description: "New description" });
});

Deno.test("payment-update: is idempotent — an update overwrites the same fields", () => {
  assertEquals(paymentUpdate.idempotent, true);
});
