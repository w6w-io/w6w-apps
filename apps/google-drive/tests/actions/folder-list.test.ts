import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-list.ts";

Deno.test("folder-list: filters to folder mime; adds parent + trashed clauses", async () => {
  const body = { files: [{ id: "fld-1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ parentFolderId: "root-fld" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/files");
  const q = url.searchParams.get("q")!;
  assertEquals(q.includes(`mimeType = 'application/vnd.google-apps.folder'`), true);
  assertEquals(q.includes(`'root-fld' in parents`), true);
  assertEquals(q.includes("trashed = false"), true);
  assertEquals(url.searchParams.get("pageSize"), "100");
});
