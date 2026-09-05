import { assertEquals } from "@std/assert";
import giftList from "../../actions/gift-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("gift-list: hits /api/v1/constituents/{id}/gifts.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, received_amount: 50 }]) }]);
  const out = await giftList.execute({ constituent_id: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents/7/gifts.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("gift-list: pagination is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await giftList.execute({ constituent_id: 7, limit: 10, offset: 5 }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "10", offset: "5" });
});
