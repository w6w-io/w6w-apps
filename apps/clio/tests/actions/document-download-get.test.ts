import { assert, assertEquals } from "@std/assert";
import documentDownloadGet from "../../actions/document-download-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-download-get: follows the 303 manually and returns the Location, not bytes", async () => {
  const signedUrl =
    "https://clio-manage-prod-us-a-documents.s3.amazonaws.com/abc?X-Amz-Signature=xyz";
  const { ctx, calls } = mockCtx([{ status: 303, headers: { location: signedUrl } }]);
  const out = await documentDownloadGet.execute({ id: 11 }, ctx) as { downloadUrl: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/documents/11/download.json");
  assertEquals(calls[0].redirect, "manual");
  assertEquals(out.downloadUrl, signedUrl);
});

Deno.test("document-download-get: a document_version_id is forwarded as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 303, headers: { location: "https://example.com/x" } }]);
  await documentDownloadGet.execute({ id: 11, documentVersionId: 4 }, ctx);
  assert(calls[0].url.includes("document_version_id=4"), calls[0].url);
});

Deno.test("document-download-get: a 404 surfaces the vendor's own error, not a generic failure", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("record_not_found", "no such document"),
  }]);
  let threw = false;
  try {
    await documentDownloadGet.execute({ id: 999 }, ctx);
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("record_not_found"), (e as Error).message);
  }
  assert(threw);
});
