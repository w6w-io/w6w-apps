import { assertEquals } from "@std/assert";
import folderUpdate from "../../actions/folder-update.ts";
import { jsonBody, mockCtx, url } from "../_helpers.ts";

const folder = { uri: "/users/152184/projects/12345", name: "Renamed" };

Deno.test("folder-update: PATCHes /me/projects/{id} with the name", async () => {
  const { ctx, calls } = mockCtx([{ body: folder }]);
  await folderUpdate.execute({ folderId: "12345", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url(calls[0]).pathname, "/me/projects/12345");
  assertEquals(jsonBody(calls[0]), { name: "Renamed" });
});

/**
 * Rename is the whole surface: `edit_project` documents exactly one body field
 * and marks it required, so `name` is a required param rather than optional.
 */
Deno.test("folder-update: name is the only body field, and it is required", () => {
  const name = (folderUpdate.params ?? []).find((p) => p.key === "name");
  assertEquals(name?.required, true);
  assertEquals((folderUpdate.params ?? []).map((p) => p.key), ["folderId", "name", "fields"]);
});

Deno.test("folder-update: is a convergent perform", () => {
  assertEquals(folderUpdate.type, "perform");
  assertEquals(folderUpdate.idempotent, true);
});
