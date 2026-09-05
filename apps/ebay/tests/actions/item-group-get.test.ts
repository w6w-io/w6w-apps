import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-group-get.ts";

Deno.test("item-group-get: fetches every variation in the group", async () => {
  const { ctx, calls } = mockCtx([{
    body: { items: [{ itemId: "v1|1|1" }, { itemId: "v1|1|2" }] },
  }]);
  const result = await action.execute!({ itemGroupId: "123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/buy/browse/v1/item/get_items_by_item_group");
  assertEquals(url.searchParams.get("item_group_id"), "123");
  assertEquals(result, { items: [{ itemId: "v1|1|1" }, { itemId: "v1|1|2" }] });
});

Deno.test("item-group-get: itemGroupId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ itemGroupId: "" }, ctx)),
    Error,
    "`itemGroupId`",
  );
  assertEquals(calls.length, 0);
});
