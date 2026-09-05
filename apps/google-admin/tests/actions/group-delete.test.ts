import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-delete.ts";

Deno.test("group-delete: DELETEs /groups/{groupKey}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ groupKey: "g-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups/g-1");
  assertEquals(result, { groupKey: "g-1", success: true });
});
