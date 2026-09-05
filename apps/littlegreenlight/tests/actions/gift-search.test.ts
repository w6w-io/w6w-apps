import { assertEquals } from "@std/assert";
import giftSearch from "../../actions/gift-search.ts";
import { envelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("gift-search: hits /api/v1/gifts/search.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1 }]) }]);
  await giftSearch.execute({ filters: ["updated_from=2016-01-01"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/gifts/search.json");
});

Deno.test("gift-search: sends the filter as a q[] clause", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await giftSearch.execute({ filters: ["updated_from=2016-01-01"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "q[]"), ["updated_from=2016-01-01"]);
});

Deno.test("gift-search: sort without sortDescending is sent bare", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await giftSearch.execute({ filters: ["updated_from=2016-01-01"], sort: "gift_amount" }, ctx);
  assertEquals(queryOf(calls[0].url).sort, "gift_amount");
});
