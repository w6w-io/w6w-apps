import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/item-search.ts";

Deno.test("item-search: searches by keyword", async () => {
  const { ctx, calls } = mockCtx([{ body: { itemSummaries: [{ itemId: "v1|1|0" }], total: 1 } }]);
  const result = await action.execute!({ q: "iphone" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/buy/browse/v1/item_summary/search");
  assertEquals(url.searchParams.get("q"), "iphone");
  assertEquals(calls[0].headers["x-ebay-c-marketplace-id"], "EBAY_US");
  assertEquals(result, { itemSummaries: [{ itemId: "v1|1|0" }], total: 1 });
});

Deno.test("item-search: searches by category alone, without keywords", async () => {
  const { ctx, calls } = mockCtx([{ body: { itemSummaries: [] } }]);
  await action.execute!({ categoryIds: "9355" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("q"), false);
  assertEquals(url.searchParams.get("category_ids"), "9355");
});

Deno.test("item-search: requires q or categoryIds", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({}, ctx)),
    Error,
    "requires one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-search: passes filter, sort, limit and offset through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    q: "shirt",
    filter: "price:[10..50]",
    sort: "price",
    limit: 10,
    offset: 20,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter"), "price:[10..50]");
  assertEquals(url.searchParams.get("sort"), "price");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "20");
});

Deno.test("item-search: honors a non-default marketplace", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ q: "shirt", marketplaceId: "EBAY_GB" }, ctx);
  assertEquals(calls[0].headers["x-ebay-c-marketplace-id"], "EBAY_GB");
});
