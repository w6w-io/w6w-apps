import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

Deno.test("item-get: fetches the item by RESTful item ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { itemId: "v1|123456789012|0", title: "Widget" } }]);
  const result = await action.execute!({ itemId: "v1|123456789012|0" }, ctx);
  assertEquals(calls[0].url, "https://api.ebay.com/buy/browse/v1/item/v1%7C123456789012%7C0");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["x-ebay-c-marketplace-id"], "EBAY_US");
  assertEquals(result, { itemId: "v1|123456789012|0", title: "Widget" });
});

Deno.test("item-get: itemId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ itemId: "" }, ctx)),
    Error,
    "`itemId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-get: honors a non-default marketplace", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ itemId: "v1|1|0", marketplaceId: "EBAY_DE" }, ctx);
  assertEquals(calls[0].headers["x-ebay-c-marketplace-id"], "EBAY_DE");
});
