import { assertEquals } from "@std/assert";
import boardList from "../../actions/board-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("board-list: calls GET /boards and returns the bookmark page", async () => {
  const { ctx, calls } = mockCtx([
    { body: { items: [{ id: "1" }, { id: "2" }], bookmark: "cursor-1" } },
  ]);
  const out = await boardList.execute({}, ctx) as { items: unknown[]; bookmark: string };

  assertEquals(pathOf(calls[0].url), "/v5/boards");
  assertEquals(out.items.length, 2);
  assertEquals(out.bookmark, "cursor-1");
});

Deno.test("board-list: forwards privacy, page_size and bookmark", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await boardList.execute({ privacy: "SECRET", pageSize: 50, bookmark: "abc" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.privacy, "SECRET");
  assertEquals(q.page_size, "50");
  assertEquals(q.bookmark, "abc");
});
