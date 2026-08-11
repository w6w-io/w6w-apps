import { assertEquals } from "@std/assert";
import folderItemList from "../../actions/folder-item-list.ts";
import { collection, mockCtx, q, url } from "../_helpers.ts";

/** Items are videos, subfolders AND live events — not the same as folder-video-list. */
Deno.test("folder-item-list: hits /me/projects/{id}/items", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ type: "folder" }, { type: "video" }]) }]);
  const out = await folderItemList.execute({ folderId: "12345" }, ctx);
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/items");
  assertEquals(out.total, 2);
});

Deno.test("folder-item-list: forwards the kind filter and the privacy list", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await folderItemList.execute({
    folderId: "1",
    filter: "video",
    clipPrivacyFilters: "private, unlisted",
    sort: "alphabetical",
    direction: "asc",
    page: 2,
    perPage: 50,
    fields: "uri",
  }, ctx);
  assertEquals(q(calls[0], "filter"), "video");
  assertEquals(q(calls[0], "clip_privacy_filters"), "private,unlisted");
  assertEquals(q(calls[0], "sort"), "alphabetical");
  assertEquals(q(calls[0], "direction"), "asc");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "50");
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("folder-item-list: offers all three documented item kinds", () => {
  const filter = (folderItemList.params ?? []).find((p) => p.key === "filter");
  const values = (filter?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.sort(), ["folder", "live_event", "video"]);
});

Deno.test("folder-item-list: is a search action", () => {
  assertEquals(folderItemList.type, "search");
});
