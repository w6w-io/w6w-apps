import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: POSTs /files/search_v2 with query and default options", async () => {
  const resp = { matches: [], has_more: false };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ query: "invoice" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/search_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.query, "invoice");
  assertEquals(payload.options.filename_only, true);
  assertEquals(payload.options.max_results, 100);
  assertEquals(payload.options.file_status, "active");
  assertEquals(result, resp);
});

Deno.test("search: splits comma-separated extensions/categories into arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: { matches: [], has_more: false } }]);
  await action.execute!(
    {
      query: "q",
      path: "/reports",
      fileExtensions: "pdf, csv",
      fileCategories: "document,spreadsheet",
      fileStatus: "deleted",
      maxResults: 25,
      filenameOnly: false,
    },
    ctx,
  );
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.options.path, "/reports");
  assertEquals(payload.options.file_extensions, ["pdf", "csv"]);
  assertEquals(payload.options.file_categories, ["document", "spreadsheet"]);
  assertEquals(payload.options.file_status, "deleted");
  assertEquals(payload.options.filename_only, false);
  assertEquals(payload.options.max_results, 25);
});

Deno.test("search: switches to /files/search/continue_v2 when cursor is provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { matches: [], has_more: false } }]);
  await action.execute!({ query: "ignored-when-cursor", cursor: "cur-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/search/continue_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.cursor, "cur-1");
  assertEquals(payload.query, undefined);
});
