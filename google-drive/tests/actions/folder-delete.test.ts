import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-delete.ts";

Deno.test("folder-delete: trashes by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const result = await action.execute!({ folderId: "fld-1" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/drive/v3/files/fld-1");
  assertEquals(JSON.parse(calls[0].body!).trashed, true);
  assertEquals(result, { id: "fld-1", success: true });
});
