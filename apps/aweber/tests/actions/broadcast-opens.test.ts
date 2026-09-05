import { assertEquals } from "@std/assert";
import broadcastOpens from "../../actions/broadcast-opens.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The whole point of this test: this endpoint pages with a before/after
 * cursor and page_size, not the ws.start/ws.size pair every other
 * collection in this app uses.
 */
Deno.test("broadcast-opens: pages with after/before/page_size, not ws.start/ws.size", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ email: "a@b.com" }]) }]);
  await broadcastOpens.execute(
    { accountId: "1", listId: "2", broadcastId: "1", after: "cursor-abc", pageSize: 50 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1/opens");
  const q = queryOf(calls[0].url);
  assertEquals(q.after, "cursor-abc");
  assertEquals(q.page_size, "50");
  assertEquals("ws.start" in q, false);
  assertEquals("ws.size" in q, false);
});
