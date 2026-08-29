import { assertEquals } from "@std/assert";
import bookList from "../../actions/book-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("book-list: GETs the books collection", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ id: 1776, title: "Early Retirement Extreme" }]),
  }]);
  const out = await bookList.execute({}, ctx) as { count: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/books/");
  assertEquals(out.count, 1);
});

Deno.test("book-list: forwards category (including supplementals) and source", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await bookList.execute({ category: "supplementals", source: "kindle" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.category, "supplementals");
  assertEquals(q.source, "kindle");
});

Deno.test("book-list: forwards last_highlight_at filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await bookList.execute({ last_highlight_at__gt: "2020-01-01T00:00:00Z" }, ctx);
  assertEquals(queryOf(calls[0].url).last_highlight_at__gt, "2020-01-01T00:00:00Z");
});
