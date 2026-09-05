import { assert, assertEquals } from "@std/assert";
import projectGetMany from "../../actions/project-get-many.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-get-many: GETs the flat, unpaginated /project list", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", key: "ENG" }, { id: "2", key: "OPS" }] }]);
  const out = await projectGetMany.execute({}, ctx) as unknown[];

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/project");
  assert(Array.isArray(out));
  assertEquals(out.length, 2);
});

Deno.test("project-get-many: forwards includeArchived and recent", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await projectGetMany.execute({ includeArchived: true, recent: 5 }, ctx);
  assertEquals(queryOf(calls[0].url), { includeArchived: "true", recent: "5" });
});
