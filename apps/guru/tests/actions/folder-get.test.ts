import { assertEquals } from "@std/assert";
import folderGet from "../../actions/folder-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("folder-get: fetches by id and strips the embedded collection token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "f1", title: "Onboarding", collection: { id: "co1", token: "t" } } },
  ]);
  const result = await folderGet.execute({ folderId: "f1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/folders/f1");
  assertEquals(result, { id: "f1", title: "Onboarding", collection: { id: "co1" } });
});

Deno.test("folder-get: passes collectionId through for the homeBoardSlug case", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "home" } }]);
  await folderGet.execute({ folderId: "home-slug", collectionId: "co1" }, ctx);
  assertEquals(queryOf(calls[0].url), { collection: "co1" });
});
