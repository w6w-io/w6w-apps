import { assertEquals } from "@std/assert";
import groupDelete from "../../actions/group-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-delete: DELETEs by id and returns deleted: true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await groupDelete.execute({ groupId: "group_abc" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups/group_abc");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
