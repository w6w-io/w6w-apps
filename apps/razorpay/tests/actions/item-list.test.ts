import { assertEquals } from "@std/assert";
import itemList from "../../actions/item-list.ts";
import { collection, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("item-list: lists /items", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "item_1" }]) }]);
  const out = await itemList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/items");
  assertEquals(out, collection([{ id: "item_1" }]));
});
