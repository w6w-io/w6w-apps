import { assertEquals } from "@std/assert";
import highlightList from "../../actions/highlight-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("highlight-list: GETs the highlights collection", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, text: "x" }]) }]);
  const out = await highlightList.execute({}, ctx) as { count: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.count, 1);
});

Deno.test("highlight-list: forwards book_id and the date-range filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await highlightList.execute({
    bookId: "1337",
    updated__gt: "2020-02-01T00:00:00Z",
    highlighted_at__lt: "2020-03-01T00:00:00Z",
    page_size: 10,
  }, ctx);

  const q = queryOf(calls[0].url);
  assertEquals(q.book_id, "1337");
  assertEquals(q.updated__gt, "2020-02-01T00:00:00Z");
  assertEquals(q.highlighted_at__lt, "2020-03-01T00:00:00Z");
  assertEquals(q.page_size, "10");
});

Deno.test("highlight-list: unset filters are not sent on the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await highlightList.execute({}, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(Object.keys(q).length, 0);
});
