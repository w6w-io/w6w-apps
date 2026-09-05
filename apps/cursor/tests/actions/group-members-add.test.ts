import { assertEquals, assertRejects } from "@std/assert";
import groupMembersAdd from "../../actions/group-members-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-members-add: posts a parsed userIds list", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: {} } }]);
  await groupMembersAdd.execute({ groupId: "group_abc", userIds: "user_abc123, user_def456" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups/group_abc/members");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { userIds: ["user_abc123", "user_def456"] });
});

Deno.test("group-members-add: rejects an empty userIds list", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () =>
    await groupMembersAdd.execute({ groupId: "group_abc", userIds: "" }, ctx)
  );
});
