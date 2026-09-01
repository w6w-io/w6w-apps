import { assertEquals } from "@std/assert";
import paymentLinkDelete from "../../actions/payment-link-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-delete: sends DELETE to /payment-links/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await paymentLinkDelete.execute({ paymentLinkId: "pl_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payment-links/pl_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { paymentLinkId: "pl_1", deleted: true });
});
