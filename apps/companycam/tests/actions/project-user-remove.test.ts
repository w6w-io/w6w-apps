import { assertEquals } from "@std/assert";
import projectUserRemove from "../../actions/project-user-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-user-remove: DELETEs the assignment and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await projectUserRemove.execute({ projectId: "1", userId: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/assigned_users/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
