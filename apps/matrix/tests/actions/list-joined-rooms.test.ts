import { assertEquals } from "@std/assert";
import listJoinedRooms from "../../actions/list-joined-rooms.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("list-joined-rooms: GETs /joined_rooms", async () => {
  const { ctx, calls } = mockMatrixCtx([{
    body: { joined_rooms: ["!a:example.org", "!b:example.org"] },
  }]);
  const result = await listJoinedRooms.execute({}, ctx);
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/joined_rooms`);
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { roomIds: ["!a:example.org", "!b:example.org"] });
});
