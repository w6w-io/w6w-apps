import { assertEquals } from "@std/assert";
import paymentLinkList from "../../actions/payment-link-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-list: unwraps _embedded.payment_links (underscore, not camelCase)", async () => {
  const { ctx, calls } = mockCtx([{ body: list("payment_links", [{ id: "pl_1" }]) }]);
  const out = await paymentLinkList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payment-links");
  assertEquals(out, { count: 1, items: [{ id: "pl_1" }] });
});
