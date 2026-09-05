import { assertEquals } from "@std/assert";
import folderCreate from "../../actions/folder-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-create: POSTs title + collection and strips the response token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "f1", title: "Onboarding", collection: { id: "co1", token: "t" } } },
  ]);
  const result = await folderCreate.execute({ title: "Onboarding", collectionId: "co1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/folders");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { title: "Onboarding", collection: { id: "co1" } });
  assertEquals(result, { id: "f1", title: "Onboarding", collection: { id: "co1" } });
});

Deno.test("folder-create: parentFolderId nests the new folder when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f2" } }]);
  await folderCreate.execute({ title: "Sub", collectionId: "co1", parentFolderId: "f1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parentFolderId, "f1");
});
