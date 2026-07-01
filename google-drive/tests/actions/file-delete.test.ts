import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-delete.ts";

Deno.test("file-delete: trashes the file by default (PATCH trashed:true)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f-1", trashed: true } }]);
  const result = await action.execute!({ fileId: "f-1" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/drive/v3/files/f-1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.trashed, true);
  assertEquals(result, { id: "f-1", success: true });
});

Deno.test("file-delete: permanent=true issues DELETE", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ fileId: "f-1", permanent: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
});
