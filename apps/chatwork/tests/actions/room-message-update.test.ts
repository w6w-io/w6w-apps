import { assertEquals } from "@std/assert";
import roomMessageUpdate from "../../actions/room-message-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-message-update: PUTs the new body", async () => {
  const { ctx, calls } = mockCtx([{ body: { message_id: "101" } }]);
  const out = await roomMessageUpdate.execute(
    { roomId: "5", messageId: "101", body: "Edited" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/messages/101");
  assertEquals(calls[0].method, "PUT");
  assertEquals(formOf(calls[0]), { body: "Edited" });
  assertEquals(out, { message_id: "101" });
});
