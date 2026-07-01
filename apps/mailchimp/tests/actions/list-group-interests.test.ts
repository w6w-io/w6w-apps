import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-group-interests.ts";

Deno.test("list-group-interests: GETs /lists/{listId}/interest-categories/{categoryId}/interests", async () => {
  const { ctx, calls } = mockCtx([{ body: { interests: [], total_items: 0 } }]);
  await action.execute!(
    { listId: "abc", categoryId: "cat-1", count: 10, offset: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/3.0/lists/abc/interest-categories/cat-1/interests");
  assertEquals(url.searchParams.get("count"), "10");
  assertEquals(url.searchParams.get("offset"), "5");
});
