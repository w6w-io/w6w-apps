import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: reads a single project by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1", name: "Acme" } }]);
  const out = await projectGet.execute({ projectId: "p1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1");
  assertEquals(out, { project_id: "p1", name: "Acme" });
});

Deno.test("project-get: escapes a project id containing path-breaking characters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectGet.execute({ projectId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api2/projects/a%2Fb");
});
