import { assertEquals } from "@std/assert";
import projectDuplicate from "../../actions/project-duplicate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-duplicate: POST /projects/:id/duplicate stringifies boolean flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 9, name: "Copy" } }]);
  const out = await projectDuplicate.execute(
    { id: 8, includeTasks: true, includeLabels: false },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/projects/8/duplicate");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { include_tasks: "true", include_labels: "false" });
  assertEquals(out, { id: 9, name: "Copy" });
});
