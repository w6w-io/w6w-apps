import { assertEquals } from "@std/assert";
import documentDownloadLinkCreate from "../../actions/document-download-link-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-download-link-create: POSTs /document/{id}/download/link", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { link: "https://signnow.com/s/1" } }]);
  const out = await documentDownloadLinkCreate.execute({ documentId: "doc-1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/document/doc-1/download/link");
  assertEquals(out.link, "https://signnow.com/s/1");
});
