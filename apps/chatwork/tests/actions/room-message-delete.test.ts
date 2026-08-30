import { assertEquals } from "@std/assert";
import roomMessageDelete from "../../actions/room-message-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-message-delete: DELETEs the message and returns its id", async () => {
  const { ctx, calls } = mockCtx([{ body: { message_id: "101" } }]);
  const out = await roomMessageDelete.execute({ roomId: "5", messageId: "101" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/messages/101");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { message_id: "101" });
});
