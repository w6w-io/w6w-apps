import { assertEquals } from "@std/assert";
import folderVideoList from "../../actions/folder-video-list.ts";
import { collection, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("folder-video-list: hits /me/projects/{id}/videos", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([video(1)]) }]);
  await folderVideoList.execute({ folderId: "12345" }, ctx);
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/videos");
});

/** Off by default, so a folder whose videos live one level down looks empty. */
Deno.test("folder-video-list: include_subfolders is only sent when set", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }, { body: collection([]) }]);
  await folderVideoList.execute({ folderId: "1" }, ctx);
  assertEquals(q(calls[0], "include_subfolders"), null);

  await folderVideoList.execute({ folderId: "1", includeSubfolders: true }, ctx);
  assertEquals(q(calls[1], "include_subfolders"), "true");
});

Deno.test("folder-video-list: forwards the search and tag filters", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await folderVideoList.execute({
    folderId: "1",
    query: "reel",
    queryFields: ["title", "tags"],
    filterTag: "abc, xyz",
    filterTagAllOf: "a",
    filterTagExclude: "b",
    sort: "date",
    direction: "desc",
    fields: "uri",
  }, ctx);
  assertEquals(q(calls[0], "query"), "reel");
  assertEquals(q(calls[0], "query_fields"), "title,tags");
  assertEquals(q(calls[0], "filter_tag"), "abc,xyz");
  assertEquals(q(calls[0], "filter_tag_all_of"), "a");
  assertEquals(q(calls[0], "filter_tag_exclude"), "b");
  assertEquals(q(calls[0], "sort"), "date");
  assertEquals(q(calls[0], "direction"), "desc");
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("folder-video-list: is a search action", () => {
  assertEquals(folderVideoList.type, "search");
});
