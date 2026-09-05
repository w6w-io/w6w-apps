import { assertEquals } from "@std/assert";
import purchaseList from "../../actions/purchase-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("purchase-list: calls GET /1/Purchases", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const out = await purchaseList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1/Purchases");
  assertEquals(out.items.length, 1);
});
