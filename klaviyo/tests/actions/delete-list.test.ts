import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-list.ts";

Deno.test("delete-list: DELETEs /lists/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  await action.execute!({ listId: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/lists/L1/");
  assertEquals(calls[0].method, "DELETE");
});
