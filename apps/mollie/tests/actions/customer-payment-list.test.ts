import { assertEquals } from "@std/assert";
import customerPaymentList from "../../actions/customer-payment-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-payment-list: unwraps _embedded.payments for one customer", async () => {
  const { ctx, calls } = mockCtx([{ body: list("payments", [{ id: "tr_1" }]) }]);
  const out = await customerPaymentList.execute({ customerId: "cst_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/payments");
  assertEquals(out, { count: 1, items: [{ id: "tr_1" }] });
});
