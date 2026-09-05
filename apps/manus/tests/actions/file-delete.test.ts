import { assertEquals } from "@std/assert";
import fileDelete from "../../actions/file-delete.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("file-delete: posts file_id to /v2/file.delete", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({}) }]);
  await fileDelete.execute({ fileId: "f1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/file.delete");
  assertEquals(JSON.parse(calls[0].body!), { file_id: "f1" });
});

Deno.test("file-delete: is idempotent", () => {
  assertEquals(fileDelete.idempotent, true);
});
