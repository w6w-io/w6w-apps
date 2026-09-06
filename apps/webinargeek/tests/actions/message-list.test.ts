import { assertEquals } from "@std/assert";
import messageList from "../../actions/message-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-list: hits GET /messages filtered by type", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        total_count: 1,
        messages: [{ id: 1, type: "private" }],
        pages: { next: null, page: 1, per_page: 50, total_pages: 1 },
      },
    },
  ]);
  const out = await messageList.execute({ broadcastId: 5, type: "private" }, ctx) as {
    messages: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/messages");
  const q = queryOf(calls[0].url);
  assertEquals(q.broadcast_id, "5");
  assertEquals(q.type, "private");
  assertEquals(out.messages, [{ id: 1, type: "private" }]);
});
