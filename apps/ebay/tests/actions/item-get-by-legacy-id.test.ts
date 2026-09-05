import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-get-by-legacy-id.ts";

Deno.test("item-get-by-legacy-id: fetches by legacy numeric ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { itemId: "v1|123|0", legacyItemId: "123" } }]);
  const result = await action.execute!({ legacyItemId: "123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/buy/browse/v1/item/get_item_by_legacy_id");
  assertEquals(url.searchParams.get("legacy_item_id"), "123");
  assertEquals(url.searchParams.has("legacy_variation_id"), false);
  assertEquals(result, { itemId: "v1|123|0", legacyItemId: "123" });
});

Deno.test("item-get-by-legacy-id: legacyItemId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ legacyItemId: "" }, ctx)),
    Error,
    "`legacyItemId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-get-by-legacy-id: passes variation id/sku when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ legacyItemId: "123", legacyVariationId: "456" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("legacy_variation_id"), "456");
});
