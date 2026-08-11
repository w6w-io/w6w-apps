import { assertEquals } from "@std/assert";
import projectArchive from "../../actions/project-archive.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The verb is the whole point: `archive` is the only PATCH in this API, and its
 * sibling `restore` is a PUT. Sending the wrong one archives nothing.
 */
Deno.test("project-archive: PATCHes, which no other endpoint in this API does", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", archived: true } }]);
  const project = await projectArchive.execute({ projectId: "1" }, ctx) as { archived: boolean };
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/archive");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].body, null);
  assertEquals(project.archived, true);
});
