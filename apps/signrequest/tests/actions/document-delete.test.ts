import { assertEquals, assertRejects } from "@std/assert";
import documentDelete from "../../actions/document-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-delete: DELETEs /documents/{id}/ and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await documentDelete.execute({ documentId: "doc-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/api/v1/documents/doc-1/");
  assertEquals(out, { deleted: true });
});

Deno.test("document-delete: propagates a 404 as an error rather than reporting success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "Not found." } }]);
  await assertRejects(async () => {
    await documentDelete.execute({ documentId: "doc-1" }, ctx);
  });
});
