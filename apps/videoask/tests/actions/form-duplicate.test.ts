import { assertEquals } from "@std/assert";
import formDuplicate from "../../actions/form-duplicate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-duplicate: POSTs to /forms/{formId}/duplicate with an optional folder_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { form_id: "f2" } }]);
  await formDuplicate.execute({ formId: "f1", folderId: "folder-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/forms/f1/duplicate");
  assertEquals(JSON.parse(calls[0].body!), { folder_id: "folder-1" });
});

Deno.test("form-duplicate: with no folder given, the body is empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formDuplicate.execute({ formId: "f1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
