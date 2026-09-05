import { assertEquals } from "@std/assert";
import collectionList from "../../actions/collection-list.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("collection-list: mode=mine queries q=mine and unwraps list/total", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: envelope({ list: [{ collectionId: "c1" }], total: 1 }) },
  ]);
  const out = await collectionList.execute({ mode: "mine" }, ctx) as {
    items: unknown[];
    total: number;
  };

  assertEquals(queryOf(calls[0].url), { q: "mine" });
  assertEquals(out.items.length, 1);
  assertEquals(out.total, 1);
});

Deno.test("collection-list: mode=byContent queries findByContentId with contentId", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ list: [], total: 0 }) }]);
  await collectionList.execute({ mode: "byContent", contentId: "P1.C1" }, ctx);
  assertEquals(queryOf(calls[0].url), { q: "findByContentId", contentId: "P1.C1" });
});
