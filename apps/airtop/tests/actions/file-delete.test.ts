import { assertEquals } from "@std/assert";
import fileDelete from "../../actions/file-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-delete: DELETEs the file and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await fileDelete.execute({ fileId: "f1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/files/f1");
  assertEquals(out, { success: true, fileId: "f1" });
});

Deno.test("file-delete: is declared idempotent", () => {
  assertEquals(fileDelete.idempotent, true);
});
