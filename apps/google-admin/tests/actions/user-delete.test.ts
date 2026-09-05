import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

Deno.test("user-delete: DELETEs /users/{userKey}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ userKey: "u-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/users/u-1");
  assertEquals(result, { userKey: "u-1", success: true });
});
