import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-delete.ts";

Deno.test("files-delete: DELETEs /files/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true, id: "file-1" } }]);
  const result = await action.execute!({ fileId: "file-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/files/file-1");
  assertEquals(result, { deleted: true, id: "file-1" });
});

Deno.test("files-delete: is marked idempotent (retries safe to enable)", () => {
  assertEquals(action.idempotent, true);
});
