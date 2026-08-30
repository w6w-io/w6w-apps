import { assertEquals } from "@std/assert";
import roomMessageSend from "../../actions/room-message-send.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-message-send: posts the body, omitting self_unread by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { message_id: "999" } }]);
  const out = await roomMessageSend.execute({ roomId: "5", body: "Hello Chatwork!" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(formOf(calls[0]), { body: "Hello Chatwork!" });
  assertEquals(out, { message_id: "999" });
});

Deno.test("room-message-send: selfUnread true sends self_unread=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { message_id: "999" } }]);
  await roomMessageSend.execute({ roomId: "5", body: "Hi", selfUnread: true }, ctx);
  assertEquals(formOf(calls[0]), { body: "Hi", self_unread: "1" });
});

Deno.test("room-message-send: is not idempotent — retrying posts a duplicate message", () => {
  assertEquals(roomMessageSend.idempotent, false);
});
