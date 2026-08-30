import { assertEquals } from "@std/assert";
import roomMessageGet from "../../actions/room-message-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-message-get: calls GET /rooms/{room_id}/messages/{message_id}", async () => {
  const message = {
    message_id: "101",
    body: "Hello Chatwork!",
    send_time: 1384242850,
    update_time: 0,
  };
  const { ctx, calls } = mockCtx([{ body: message }]);
  const out = await roomMessageGet.execute({ roomId: "5", messageId: "101" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/messages/101");
  assertEquals(out, message);
});
