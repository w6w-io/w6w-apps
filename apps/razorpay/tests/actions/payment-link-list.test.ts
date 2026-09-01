import { assertEquals } from "@std/assert";
import paymentLinkList from "../../actions/payment-link-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("payment-link-list: filters /payment_links by referenceId", async () => {
  const { ctx, calls } = mockCtx([{ body: { payment_links: [] } }]);
  await paymentLinkList.execute({ referenceId: "order-42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payment_links");
  assertEquals(queryOf(calls[0].url), { reference_id: "order-42" });
});
