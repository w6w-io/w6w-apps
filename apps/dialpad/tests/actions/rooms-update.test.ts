import { assertEquals } from "@std/assert";
import roomsUpdate from "../../actions/rooms-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rooms-update: PATCHes /rooms/{id} and splits the phone number list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await roomsUpdate.execute({ roomId: "1", phoneNumbers: "+14155550100, +14155550101" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/rooms/1");
  assertEquals(JSON.parse(calls[0].body!).phone_numbers, ["+14155550100", "+14155550101"]);
});

Deno.test("rooms-update: declared idempotent", () => {
  assertEquals(roomsUpdate.idempotent, true);
});
