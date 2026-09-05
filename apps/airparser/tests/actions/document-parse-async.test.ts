import { assertEquals } from "@std/assert";
import documentParseAsync from "../../actions/document-parse-async.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-parse-async: posts multipart to upload (not upload-sync)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { doc_id: "64abc123def456" } }]);

  const result = await documentParseAsync.execute(
    { inboxId: "in_1", file: new Blob(["PK\x03\x04"]), meta: { external_id: 42 } },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1/upload");
  assertEquals(calls[0].isFormData, true);
  assertEquals(calls[0].form?.get("meta"), JSON.stringify({ external_id: 42 }));
  assertEquals(result.doc_id, "64abc123def456");
});

Deno.test("document-parse-async: returns the response verbatim rather than assuming a shape", async () => {
  // The docs give no sample body for this endpoint — only "Returns: document
  // ID." This test pins that the action does not reshape the response.
  const { ctx } = mockCtx([{ status: 200, body: { something_else: true } }]);
  const result = await documentParseAsync.execute({ inboxId: "in_1", file: new Blob(["x"]) }, ctx);
  assertEquals(result, { something_else: true });
});

Deno.test("document-parse-async: omits meta entirely when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { doc_id: "d1" } }]);
  await documentParseAsync.execute({ inboxId: "in_1", file: new Blob(["x"]) }, ctx);
  assertEquals(calls[0].form?.has("meta"), false);
});

Deno.test("document-parse-async: declared not idempotent", () => {
  assertEquals(documentParseAsync.idempotent, false);
  assertEquals(documentParseAsync.type, "perform");
});
