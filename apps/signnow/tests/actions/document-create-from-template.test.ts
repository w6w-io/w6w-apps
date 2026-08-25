import { assertEquals } from "@std/assert";
import documentCreateFromTemplate from "../../actions/document-create-from-template.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-create-from-template: POSTs /template/{id}/copy with a name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "doc-2", document_name: "Copy" } }]);
  await documentCreateFromTemplate.execute(
    { templateId: "tpl-1", documentName: "Copy" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/template/tpl-1/copy");
  assertEquals(bodyOf(calls[0]), { document_name: "Copy" });
});

Deno.test("document-create-from-template: omits document_name when not given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "doc-2" } }]);
  await documentCreateFromTemplate.execute({ templateId: "tpl-1" }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});
