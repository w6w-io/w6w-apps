import { assertEquals } from "@std/assert";
import projectRestore from "../../actions/project-restore.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-restore: PUTs, unlike its PATCH counterpart", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", archived: false } }]);
  const project = await projectRestore.execute({ projectId: "1" }, ctx) as { archived: boolean };
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/restore");
  assertEquals(calls[0].method, "PUT");
  assertEquals(project.archived, false);
});
