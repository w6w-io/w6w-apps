import { assertEquals } from "@std/assert";
import deleteGroup from "../../actions/delete-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-group: DELETE /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await deleteGroup.execute({ groupID: "g1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v0/groups/g1");
});

Deno.test("delete-group: is idempotent", () => {
  assertEquals(deleteGroup.idempotent, true);
});
