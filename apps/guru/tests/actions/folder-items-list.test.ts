import { assertEquals } from "@std/assert";
import folderItemsList from "../../actions/folder-items-list.ts";
import { linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

type ListResult = { items: unknown[]; nextToken?: string };

Deno.test("folder-items-list: lists a folder's items and pages via the Link header", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [{ type: "card", id: "c1" }],
      headers: { link: linkHeader("page2", "/folders/f1/items") },
    },
  ]);
  const result = await folderItemsList.execute(
    { folderId: "f1", cardDetail: "FULL" },
    ctx,
  ) as ListResult;

  assertEquals(pathOf(calls[0].url), "/api/v1/folders/f1/items");
  assertEquals(queryOf(calls[0].url), { cardDetail: "FULL" });
  assertEquals(result.items, [{ type: "card", id: "c1" }]);
  assertEquals(result.nextToken, "page2");
});
