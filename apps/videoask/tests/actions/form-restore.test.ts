import { assertEquals } from "@std/assert";
import formRestore from "../../actions/form-restore.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-restore: POSTs to /forms/{formId}/restore", async () => {
  const { ctx, calls } = mockCtx([{ body: { form_id: "f1" } }]);
  await formRestore.execute({ formId: "f1", folderId: "folder-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/forms/f1/restore");
  assertEquals(JSON.parse(calls[0].body!), { folder_id: "folder-1" });
});
