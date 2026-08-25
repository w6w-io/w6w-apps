import { assertEquals } from "@std/assert";
import documentGet from "../../actions/document-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-get: GETs /document/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "doc-1", document_name: "NDA" } }]);
  const out = await documentGet.execute({ documentId: "doc-1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/document/doc-1");
  assertEquals(out.document_name, "NDA");
});

Deno.test("document-get: URL-encodes the document id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await documentGet.execute({ documentId: "doc/1 2" }, ctx);
  assertEquals(pathOf(calls[0]), "/document/doc%2F1%202");
});
