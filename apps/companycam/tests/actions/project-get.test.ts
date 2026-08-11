import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: reads one project by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "94772883", name: "Psych Office" } }]);
  const project = await projectGet.execute({ projectId: "94772883" }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/v2/projects/94772883");
  assertEquals(calls[0].method, "GET");
  assertEquals(project.name, "Psych Office");
});

Deno.test("project-get: escapes an id carrying a path separator", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectGet.execute({ projectId: "1/../webhooks" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1%2F..%2Fwebhooks");
});
