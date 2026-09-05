import { assertEquals, assertRejects } from "@std/assert";
import groupUpdate from "../../actions/group-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-update: PATCHes only name when only name is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: {} } }]);
  await groupUpdate.execute({ groupId: "group_abc", name: "Platform Engineering" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups/group_abc");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Platform Engineering" });
});

Deno.test("group-update: PATCHes only directoryGroupId when only that is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { group: {} } }]);
  await groupUpdate.execute({ groupId: "group_abc", directoryGroupId: "dir_123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { directoryGroupId: "dir_123" });
});

Deno.test("group-update: rejects when both name and directoryGroupId are given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () =>
    await groupUpdate.execute({ groupId: "group_abc", name: "X", directoryGroupId: "dir_123" }, ctx)
  );
});

Deno.test("group-update: rejects when neither is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await groupUpdate.execute({ groupId: "group_abc" }, ctx));
});
