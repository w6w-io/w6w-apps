import { assertEquals } from "@std/assert";
import roomMessageMarkRead from "../../actions/room-message-mark-read.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-message-mark-read: PUTs the message_id and returns the unread counters", async () => {
  const { ctx, calls } = mockCtx([{ body: { unread_num: 2, mention_num: 0 } }]);
  const out = await roomMessageMarkRead.execute({ roomId: "5", messageId: "101" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/messages/read");
  assertEquals(calls[0].method, "PUT");
  assertEquals(formOf(calls[0]), { message_id: "101" });
  assertEquals(out, { unread_num: 2, mention_num: 0 });
});

Deno.test("room-message-mark-read: omitting message_id marks the whole chat read", async () => {
  const { ctx, calls } = mockCtx([{ body: { unread_num: 0, mention_num: 0 } }]);
  await roomMessageMarkRead.execute({ roomId: "5" }, ctx);
  assertEquals(formOf(calls[0]), {});
});
