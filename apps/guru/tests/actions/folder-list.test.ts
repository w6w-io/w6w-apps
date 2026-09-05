import { assertEquals } from "@std/assert";
import folderList from "../../actions/folder-list.ts";
import { linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

type ListResult = { items: unknown[]; nextToken?: string };

Deno.test("folder-list: lists folders, strips tokens, and pages via the Link header", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [{ id: "f1", collection: { id: "co1", token: "t" } }],
      headers: { link: linkHeader("page2", "/folders") },
    },
  ]);
  const result = await folderList.execute(
    { collectionId: "co1", legacyTypes: ["BOARD", "SECTION"] },
    ctx,
  ) as ListResult;

  assertEquals(pathOf(calls[0].url), "/api/v1/folders");
  assertEquals(queryOf(calls[0].url), { collection: "co1", legacyTypes: "BOARD,SECTION" });
  assertEquals(result.items, [{ id: "f1", collection: { id: "co1" } }]);
  assertEquals(result.nextToken, "page2");
});
