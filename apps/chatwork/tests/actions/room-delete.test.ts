import { assertEquals } from "@std/assert";
import roomDelete from "../../actions/room-delete.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-delete: DELETEs with the chosen action_type, and returns {} on the documented 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await roomDelete.execute({ roomId: "123", actionType: "leave" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/123");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(formOf(calls[0]), { action_type: "leave" });
  assertEquals(out, {});
});

Deno.test("room-delete: is idempotent — leaving/deleting twice has no further effect", () => {
  assertEquals(roomDelete.idempotent, true);
});
