import { assertEquals } from "@std/assert";
import groupDelete from "../../actions/group-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-delete: DELETEs and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await groupDelete.execute({ groupId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/groups/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
