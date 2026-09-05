import { assertEquals } from "@std/assert";
import listFolders from "../../actions/list-folders.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-folders: calls GET /folders with compacted query params", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "f1", name: "Marketing" }], hasMore: false, nextCursor: null },
  }]);
  const out = await listFolders.execute({ query: "market", limit: 5 }, ctx) as {
    data: Array<{ id: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/v1.0/folders");
  assertEquals(queryOf(calls[0].url), { query: "market", limit: "5" });
  assertEquals(out.data[0].id, "f1");
});
