import { assertEquals } from "@std/assert";
import roomList from "../../actions/room-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-list: calls GET /rooms", async () => {
  const rooms = [{ room_id: 1, name: "Team", type: "group", role: "admin" }];
  const { ctx, calls } = mockCtx([{ body: rooms }]);
  const out = await roomList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms");
  assertEquals(out, rooms);
});
