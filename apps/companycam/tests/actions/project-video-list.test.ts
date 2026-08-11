import { assert, assertEquals } from "@std/assert";
import projectVideoList from "../../actions/project-video-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-video-list: sends the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await projectVideoList.execute({ projectId: "1", tagId: "7", page: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/videos");
  assertEquals(queryOf(calls[0].url), { tag_ids: "7", page: "1" });
});

/**
 * The vendor's prose claims parity with `/photos`, but this operation declares
 * no `after`/`before`, so the app must not offer them.
 */
Deno.test("project-video-list: offers no cursor params, which this endpoint never declared", () => {
  const keys = projectVideoList.params!.map((p) => p.key);
  assert(!keys.includes("after"), "offered an undocumented cursor param");
  assert(!keys.includes("before"), "offered an undocumented cursor param");
  assert(keys.includes("page") && keys.includes("perPage"));
});

Deno.test("project-video-list: warns about playback_url before processing", () => {
  assert(/processed/.test(projectVideoList.description!), projectVideoList.description);
});
