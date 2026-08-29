import { assertEquals } from "@std/assert";
import bookGet from "../../actions/book-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("book-get: reads one book by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1776, title: "Early Retirement Extreme" } }]);
  const out = await bookGet.execute({ bookId: "1776" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/books/1776/");
  assertEquals(out, { id: 1776, title: "Early Retirement Extreme" });
});
