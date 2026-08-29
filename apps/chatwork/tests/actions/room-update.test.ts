import { assertEquals } from "@std/assert";
import roomUpdate from "../../actions/room-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-update: PUTs only the fields given", async () => {
  const { ctx, calls } = mockCtx([{ body: { room_id: 123 } }]);
  const out = await roomUpdate.execute({ roomId: "123", name: "New Name" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/123");
  assertEquals(calls[0].method, "PUT");
  assertEquals(formOf(calls[0]), { name: "New Name" });
  assertEquals(out, { room_id: 123 });
});

Deno.test("room-update: is idempotent — a retry sets the same fields again", () => {
  assertEquals(roomUpdate.idempotent, true);
});
