import { assertEquals } from "@std/assert";
import roomMemberUpdate from "../../actions/room-member-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-member-update: PUTs the full member-role lists", async () => {
  const result = { admin: [1], member: [2, 3], readonly: [] };
  const { ctx, calls } = mockCtx([{ body: result }]);
  const out = await roomMemberUpdate.execute({
    roomId: "5",
    membersAdminIds: "1",
    membersMemberIds: "2,3",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/members");
  assertEquals(calls[0].method, "PUT");
  assertEquals(formOf(calls[0]), { members_admin_ids: "1", members_member_ids: "2,3" });
  assertEquals(out, result);
});

Deno.test("room-member-update: is a full replace — this is documented, not inferred", () => {
  assertEquals((roomMemberUpdate.description ?? "").includes("entire member list"), true);
});
