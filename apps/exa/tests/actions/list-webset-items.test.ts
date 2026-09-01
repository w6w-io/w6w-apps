import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-webset-items.ts";

Deno.test("list-webset-items: GETs /v0/websets/{webset}/items", async () => {
  const body = { data: [{ id: "item_1" }], hasMore: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ websetId: "ws_1", limit: 50 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/websets/ws_1/items");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(result, body);
});

Deno.test("list-webset-items: forwards sourceId and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasMore: false, nextCursor: null } }]);
  await action.execute!({ websetId: "ws_1", sourceId: "search_1", cursor: "c2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sourceId"), "search_1");
  assertEquals(url.searchParams.get("cursor"), "c2");
});
