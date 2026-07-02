import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-folder.ts";

Deno.test("list-folder: POSTs /files/list_folder with defaults", async () => {
  const resp = { entries: [], cursor: "c1", has_more: false };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ path: "/invoices" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/list_folder");
  assertEquals(calls[0].method, "POST");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.path, "/invoices");
  assertEquals(payload.recursive, false);
  assertEquals(payload.limit, 100);
  assertEquals(payload.include_mounted_folders, true);
  assertEquals(payload.include_non_downloadable_files, true);
  assertEquals(result, resp);
});

Deno.test("list-folder: switches to continue endpoint when cursor is provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [], has_more: false } }]);
  await action.execute!({ cursor: "cursor-42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/list_folder/continue");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.cursor, "cursor-42");
  // Must not send the initial-list params when continuing.
  assertEquals(payload.path, undefined);
  assertEquals(payload.recursive, undefined);
});
