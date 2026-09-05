import { assertEquals } from "@std/assert";
import sessionMessageList from "../../actions/session-message-list.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("session-message-list: lists a session's transcript, mapped to { items, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      items: [{ event_id: "ev-1", source: "user", message: "hi", created_at: 100 }],
      end_cursor: "c2",
      has_next_page: true,
    },
  }]);
  const out = await sessionMessageList.execute({ devinId: "devin-1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-1/messages`);
  assertEquals(out.nextCursor, "c2");
  assertEquals(out.items.length, 1);
  assertEquals(out.items[0].source, "user");
});

Deno.test("session-message-list: sends cursor/limit as after/first", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await sessionMessageList.execute({ devinId: "devin-1", cursor: "x", limit: 25 }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-1/messages?after=x&first=25`);
});
