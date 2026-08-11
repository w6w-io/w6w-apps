import { assertEquals } from "@std/assert";
import projectDelete from "../../actions/project-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-delete: DELETEs the project and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await projectDelete.execute({ projectId: "94772883" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/94772883");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, { status: 204 });
});

Deno.test("project-delete: says in its description that archiving is the reversible option", () => {
  assertEquals(projectDelete.idempotent, true);
  assertEquals(/Archive/.test(projectDelete.description!), true);
});
