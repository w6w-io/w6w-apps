import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-document-get.ts";

Deno.test("entry-document-get: GETs /forms/{formId}/entries/{entryId}/documents/{templateId}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        Id: "F-1",
        Name: "MyForm - 1.pdf",
        ContentType: "application/pdf",
        Size: 123,
        File: "https://www.cognitoforms.com/fa/attachmentId?token=fileToken",
        Content: "aGVsbG8=",
      },
    },
  ]);
  const result = await action.execute({ formId: "42", entryId: "e1", templateId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries/e1/documents/t1");
  assertEquals((result as { ContentType?: string }).ContentType, "application/pdf");
  assertEquals((result as { Content?: string }).Content, "aGVsbG8=");
});
