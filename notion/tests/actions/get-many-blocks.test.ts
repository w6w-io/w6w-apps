import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-blocks.ts";

Deno.test("get-many-blocks: GETs /blocks/{id}/children with page_size and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", results: [], next_cursor: null, has_more: false } }]);
  await action.execute({ blockId: "blk-1", pageSize: 25, startCursor: "cur-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/blocks/blk-1/children");
  assertEquals(url.searchParams.get("page_size"), "25");
  assertEquals(url.searchParams.get("start_cursor"), "cur-1");
});
