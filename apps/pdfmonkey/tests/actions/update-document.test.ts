import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-document.ts";

Deno.test("update-document: PUTs /documents/{id} with only the provided fields", async () => {
  const doc = { id: "doc-1", status: "pending" };
  const { ctx, calls } = mockCtx([{ body: { document: doc } }]);
  const result = await action.execute!(
    { documentId: "doc-1", payload: { name: "Mary Jane Watson" }, status: "pending" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/documents/doc-1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.document.payload, { name: "Mary Jane Watson" });
  assertEquals(body.document.status, "pending");
  assertEquals("document_template_id" in body.document, false);
  assertEquals(result, doc);
});
