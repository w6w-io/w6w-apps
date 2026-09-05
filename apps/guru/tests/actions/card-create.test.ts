import { assertEquals } from "@std/assert";
import cardCreate from "../../actions/card-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-create: posts preferredPhrase/content and strips the response token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "c1", preferredPhrase: "Hi", collection: { id: "co1", token: "t" } } },
  ]);
  const result = await cardCreate.execute(
    { title: "Hi", content: "**hello**", collectionId: "co1", shareStatus: "TEAM" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/cards/extended");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { preferredPhrase: "Hi", content: "**hello**", collection: { id: "co1" }, shareStatus: "TEAM" },
  );
  assertEquals(result, { id: "c1", preferredPhrase: "Hi", collection: { id: "co1" } });
});

Deno.test("card-create: folderIds is comma-split into an array on the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await cardCreate.execute({ title: "T", content: "c", folderIds: "f1, f2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).folderIds, ["f1", "f2"]);
});

Deno.test("card-create: omits collection/folderIds/shareStatus when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await cardCreate.execute({ title: "T", content: "c" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("collection" in body, false);
  assertEquals("folderIds" in body, false);
  assertEquals("shareStatus" in body, false);
});
