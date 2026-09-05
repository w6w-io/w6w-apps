import { assertEquals, assertRejects } from "@std/assert";
import bookmarksGetText from "../../actions/bookmarks-get-text.ts";
import { bodyOf, errorEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-get-text: returns the raw HTML body on a 200, not a parsed envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "<div>Article body &amp; more</div>",
    headers: { "content-type": "text/html; charset=UTF-8" },
  }]);
  const result = await bookmarksGetText.execute({ bookmarkId: 8 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/get_text");
  assertEquals(bodyOf(calls[0]), { bookmark_id: "8" });
  assertEquals(result, { html: "<div>Article body &amp; more</div>" });
});

Deno.test("bookmarks-get-text: a non-200 surfaces the standard error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorEnvelope(1241, "Invalid or missing bookmark_id"),
  }]);
  await assertRejects(
    async () => await bookmarksGetText.execute({ bookmarkId: -1 }, ctx),
    Error,
    "1241",
  );
});
