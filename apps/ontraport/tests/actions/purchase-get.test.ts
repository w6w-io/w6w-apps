import { assertEquals } from "@std/assert";
import purchaseGet from "../../actions/purchase-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("purchase-get: calls GET /1/Purchase?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await purchaseGet.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1/Purchase");
  assertEquals(queryOf(calls[0].url), { id: "1" });
});
