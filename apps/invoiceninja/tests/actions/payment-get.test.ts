import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/payment-get.ts";

Deno.test("payment-get: GETs /payments/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "p1" } }]);
  await action.execute({ paymentId: "p1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/payments/p1");
});
