import { assertEquals } from "@std/assert";
import paymentLinkCancel from "../../actions/payment-link-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-cancel: posts to /payment_links/{id}/cancel with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plink_1", status: "cancelled" } }]);
  const out = await paymentLinkCancel.execute({ id: "plink_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payment_links/plink_1/cancel");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "plink_1", status: "cancelled" });
});
