import { assertEquals } from "@std/assert";
import leaveRoom from "../../actions/leave-room.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("leave-room: POSTs /rooms/{roomId}/leave", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await leaveRoom.execute({ roomId: "!x:example.org", reason: "bye" }, ctx);
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/leave`);
  assertEquals(JSON.parse(calls[0].body!), { reason: "bye" });
  assertEquals(result, { left: true });
});

Deno.test("leave-room: is idempotent", () => {
  assertEquals(leaveRoom.idempotent, true);
});
