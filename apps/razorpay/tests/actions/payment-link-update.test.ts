import { assertEquals } from "@std/assert";
import paymentLinkUpdate from "../../actions/payment-link-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-link-update: patches only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "plink_1", status: "created" } }]);
  await paymentLinkUpdate.execute({ id: "plink_1", expireBy: 2000000000 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payment_links/plink_1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { expire_by: 2000000000 });
});
