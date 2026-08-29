import { assertEquals } from "@std/assert";
import highlightExport from "../../actions/highlight-export.ts";
import { exportPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("highlight-export: GETs /export/ with no params on the first call", async () => {
  const { ctx, calls } = mockCtx([{ body: exportPage([{ user_book_id: 1 }]) }]);
  const out = await highlightExport.execute({}, ctx) as {
    count: number;
    nextPageCursor: string | null;
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/export/");
  assertEquals(Object.keys(queryOf(calls[0].url)).length, 0);
  assertEquals(out.count, 1);
  assertEquals(out.nextPageCursor, null);
});

Deno.test("highlight-export: forwards pageCursor for a follow-up page", async () => {
  const { ctx, calls } = mockCtx([{ body: exportPage([], { nextPageCursor: "abc" }) }]);
  await highlightExport.execute({ pageCursor: "cursor-1" }, ctx);
  assertEquals(queryOf(calls[0].url).pageCursor, "cursor-1");
});

Deno.test("highlight-export: forwards updatedAfter for the incremental-sync path", async () => {
  const { ctx, calls } = mockCtx([{ body: exportPage([]) }]);
  await highlightExport.execute({ updatedAfter: "2024-01-01T00:00:00Z" }, ctx);
  assertEquals(queryOf(calls[0].url).updatedAfter, "2024-01-01T00:00:00Z");
});

Deno.test("highlight-export: includeDeleted is sent as a literal boolean flag", async () => {
  const { ctx, calls } = mockCtx([{ body: exportPage([]) }]);
  await highlightExport.execute({ includeDeleted: true }, ctx);
  assertEquals(queryOf(calls[0].url).includeDeleted, "true");
});

Deno.test("highlight-export: is cursor-paged — the envelope has nextPageCursor, not next/previous", () => {
  const out = exportPage([]);
  assertEquals("nextPageCursor" in out, true);
  assertEquals("next" in out, false);
});
