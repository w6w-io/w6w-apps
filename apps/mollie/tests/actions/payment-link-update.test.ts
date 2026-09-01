import { assertEquals } from "@std/assert";
import paymentLinkUpdate from "../../actions/payment-link-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-update: patches archived state", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "pl_1", archived: true } }]);
  await paymentLinkUpdate.execute({ paymentLinkId: "pl_1", archived: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/payment-links/pl_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { archived: true });
});

Deno.test("payment-link-update: is idempotent", () => {
  assertEquals(paymentLinkUpdate.idempotent, true);
});
