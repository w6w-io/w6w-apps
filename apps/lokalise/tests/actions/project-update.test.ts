import { assertEquals } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-update: PUTs only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1", name: "New name" } }]);
  const out = await projectUpdate.execute({ projectId: "p1", name: "New name" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New name" });
  assertEquals(out, { project_id: "p1", name: "New name" });
});

Deno.test("project-update: is idempotent", () => {
  assertEquals(projectUpdate.idempotent, true);
});
