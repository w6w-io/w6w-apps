import { assertEquals } from "@std/assert";
import roomMemberList from "../../actions/room-member-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-member-list: calls GET /rooms/{room_id}/members", async () => {
  const members = [{ account_id: 1, role: "admin", name: "Bob" }];
  const { ctx, calls } = mockCtx([{ body: members }]);
  const out = await roomMemberList.execute({ roomId: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/members");
  assertEquals(out, members);
});
