import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-document.ts";

Deno.test("delete-document: DELETEs /documents/{id} and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ documentId: "doc-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/documents/doc-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { documentId: "doc-1", deleted: true });
});
