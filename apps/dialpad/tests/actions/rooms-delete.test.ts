import { assertEquals } from "@std/assert";
import roomsDelete from "../../actions/rooms-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rooms-delete: DELETEs /rooms/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await roomsDelete.execute({ roomId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/rooms/1");
});

Deno.test("rooms-delete: declared idempotent", () => {
  assertEquals(roomsDelete.idempotent, true);
});
