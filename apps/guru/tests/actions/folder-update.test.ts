import { assertEquals } from "@std/assert";
import folderUpdate from "../../actions/folder-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-update: PUTs only the given fields and strips the response token", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "f1", title: "New title", collection: { token: "t" } },
  }]);
  const result = await folderUpdate.execute({ folderId: "f1", title: "New title" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/folders/f1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { title: "New title" });
  assertEquals(result, { id: "f1", title: "New title", collection: {} });
});

Deno.test("folder-update: never exposes a way to move to a new parent — see the action's own doc", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1" } }]);
  await folderUpdate.execute({ folderId: "f1", description: "d" }, ctx);
  assertEquals("parentFolderId" in JSON.parse(calls[0].body!), false);
});
