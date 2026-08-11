import { assertEquals } from "@std/assert";
import folderGet from "../../actions/folder-get.ts";
import { mockCtx, q, url } from "../_helpers.ts";

const folder = { uri: "/users/152184/projects/12345", name: "Rough cuts" };

Deno.test("folder-get: fetches /me/projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: folder }]);
  const out = await folderGet.execute({ folderId: "12345" }, ctx) as typeof folder;
  assertEquals(url(calls[0]).pathname, "/me/projects/12345");
  assertEquals(out.name, "Rough cuts");
});

/** A folder's own URI is the long `/users/{id}/projects/{id}` form. */
Deno.test("folder-get: accepts the folder's full URI", async () => {
  const { ctx, calls } = mockCtx([{ body: folder }]);
  await folderGet.execute({ folderId: "/users/152184/projects/12345" }, ctx);
  assertEquals(url(calls[0]).pathname, "/me/projects/12345");
});

Deno.test("folder-get: forwards the fields filter", async () => {
  const { ctx, calls } = mockCtx([{ body: folder }]);
  await folderGet.execute({ folderId: "1", fields: "uri,name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("folder-get: is a read action", () => {
  assertEquals(folderGet.type, "read");
});
