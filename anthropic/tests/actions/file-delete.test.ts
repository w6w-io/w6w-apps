import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-delete.ts";

Deno.test("file-delete: DELETEs /v1/files/{id} with files-api beta flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "file_1", type: "file_deleted" } }]);
  await action.execute!({ fileId: "file_1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/files/file_1");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(calls[0].headers["anthropic-beta"], "files-api-2025-04-14");
});
