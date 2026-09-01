import { assertEquals } from "@std/assert";
import paymentLinkGet from "../../actions/payment-link-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-get: fetches /payment_links/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plink_1", status: "created" } }]);
  const out = await paymentLinkGet.execute({ id: "plink_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payment_links/plink_1");
  assertEquals(out, { id: "plink_1", status: "created" });
});
