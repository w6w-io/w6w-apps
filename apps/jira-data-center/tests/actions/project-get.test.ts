import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: GETs /project/{key}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", key: "ENG", name: "Engineering" } }]);
  const out = await projectGet.execute({ projectIdOrKey: "ENG" }, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/project/ENG");
  assertEquals(out.name, "Engineering");
});
