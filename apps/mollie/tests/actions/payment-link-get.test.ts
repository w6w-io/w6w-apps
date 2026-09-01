import { assertEquals } from "@std/assert";
import paymentLinkGet from "../../actions/payment-link-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-get: fetches /payment-links/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pl_1", archived: false } }]);
  const out = await paymentLinkGet.execute({ paymentLinkId: "pl_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payment-links/pl_1");
  assertEquals(out, { id: "pl_1", archived: false });
});
