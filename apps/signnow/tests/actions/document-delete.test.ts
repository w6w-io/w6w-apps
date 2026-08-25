import { assertEquals } from "@std/assert";
import documentDelete from "../../actions/document-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-delete: DELETEs /document/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  const out = await documentDelete.execute({ documentId: "doc-1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0]), "/document/doc-1");
  assertEquals(out.status, "success");
});

Deno.test("document-delete: is declared not idempotent", () => {
  assertEquals(documentDelete.idempotent, false);
});
