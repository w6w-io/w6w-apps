import { assertEquals } from "@std/assert";
import folderList from "../../actions/folder-list.ts";
import { collection, mockCtx, q, url } from "../_helpers.ts";

const folder = { uri: "/users/152184/projects/12345", name: "Rough cuts" };

/** Folders are `projects` in every path — the product word never appears there. */
Deno.test("folder-list: hits /me/projects", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([folder]) }]);
  const out = await folderList.execute({}, ctx);
  assertEquals(url(calls[0]).pathname, "/me/projects");
  assertEquals(out.total, 1);
});

Deno.test("folder-list: forwards query, sort, direction, pagination and fields", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await folderList.execute({
    query: "rough",
    sort: "modified_time",
    direction: "desc",
    page: 2,
    perPage: 100,
    fields: "uri, name",
  }, ctx);
  assertEquals(q(calls[0], "query"), "rough");
  assertEquals(q(calls[0], "sort"), "modified_time");
  assertEquals(q(calls[0], "direction"), "desc");
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "100");
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("folder-list: is a search action", () => {
  assertEquals(folderList.type, "search");
});
