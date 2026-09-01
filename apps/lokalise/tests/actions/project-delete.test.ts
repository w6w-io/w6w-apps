import { assertEquals } from "@std/assert";
import projectDelete from "../../actions/project-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-delete: DELETEs the project and returns the boolean success flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1", project_deleted: true } }]);
  const out = await projectDelete.execute({ projectId: "p1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1");
  assertEquals(out, { project_id: "p1", project_deleted: true });
});

Deno.test("project-delete: a 200 with project_deleted:false is surfaced, not hidden", async () => {
  const { ctx } = mockCtx([{ body: { project_id: "p1", project_deleted: false } }]);
  const out = await projectDelete.execute({ projectId: "p1" }, ctx) as { project_deleted: boolean };
  assertEquals(out.project_deleted, false);
});

Deno.test("project-delete: is idempotent", () => {
  assertEquals(projectDelete.idempotent, true);
});
