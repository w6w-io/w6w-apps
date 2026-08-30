import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-file-get.ts";

Deno.test("entry-file-get: GETs /forms/{formId}/entries/{entryId}/files/{fileId}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { Id: "F-1", Name: "upload.bin", ContentType: "application/octet-stream", Size: 3 } },
  ]);
  const result = await action.execute({ formId: "42", entryId: "e1", fileId: "F-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries/e1/files/F-1");
  assertEquals((result as { Name?: string }).Name, "upload.bin");
});
