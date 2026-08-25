import { assertEquals } from "@std/assert";
import documentDownload from "../../actions/document-download.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-download: base64-encodes the PDF bytes and reports content type", async () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
  const { ctx, calls } = mockCtx([
    { status: 200, body: bytes, headers: { "content-type": "application/pdf" } },
  ]);
  const out = await documentDownload.execute(
    { documentId: "doc-1", type: "collapsed" },
    ctx,
  );
  assertEquals(pathOf(calls[0]), "/document/doc-1/download");
  assertEquals(queryOf(calls[0]).get("type"), "collapsed");
  assertEquals(queryOf(calls[0]).get("with_history"), null);
  assertEquals(out.encoding, "base64");
  assertEquals(out.contentType, "application/pdf");
  assertEquals(atob(out.content), "%PDF");
});

Deno.test("document-download: sends with_history=1 only when requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: new Uint8Array([1]) }]);
  await documentDownload.execute({ documentId: "doc-1", type: "zip", withHistory: true }, ctx);
  assertEquals(queryOf(calls[0]).get("type"), "zip");
  assertEquals(queryOf(calls[0]).get("with_history"), "1");
});

Deno.test("document-download: defaults contentType from the requested format when SignNow omits it", async () => {
  const { ctx } = mockCtx([{ status: 200, body: new Uint8Array([1]), headers: {} }]);
  const out = await documentDownload.execute({ documentId: "doc-1", type: "zip" }, ctx);
  assertEquals(out.contentType, "application/zip");
});
