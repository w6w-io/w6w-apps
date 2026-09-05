import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-document.ts";

Deno.test("get-document: GETs /documents/{id} and unwraps document", async () => {
  const doc = { id: "doc-1", status: "success", payload: { name: "Peter Parker" } };
  const { ctx, calls } = mockCtx([{ body: { document: doc } }]);
  const result = await action.execute!({ documentId: "doc-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/documents/doc-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, doc);
});
