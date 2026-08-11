import { assertEquals } from "@std/assert";
import studioProjectGet from "../../actions/studio-project-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("studio-project-get: reads one project by id", async () => {
  const project = { project_id: "p1", name: "Chapter One", state: "default", chapters: [] };
  const { ctx, calls } = mockCtx([{ body: project }]);
  assertEquals(await studioProjectGet.execute({ projectId: "p1" }, ctx), project);
  assertEquals(pathOf(calls[0].url), "/v1/studio/projects/p1");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("studio-project-get: a share id is passed through when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await studioProjectGet.execute({ projectId: "p1", shareId: "s1" }, ctx);
  assertEquals(queryOf(calls[0].url), { share_id: "s1" });
});
