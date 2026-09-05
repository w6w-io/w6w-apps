import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-document.ts";

Deno.test("create-document: POSTs /documents with document_template_id, payload, and meta", async () => {
  const doc = { id: "doc-1", status: "pending", download_url: null };
  const { ctx, calls } = mockCtx([{ status: 201, body: { document: doc } }]);
  const result = await action.execute!(
    {
      documentTemplateId: "tpl-1",
      payload: { name: "Peter Parker" },
      meta: { _filename: "invoice.pdf" },
      status: "pending",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/documents");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    document: {
      document_template_id: "tpl-1",
      payload: { name: "Peter Parker" },
      meta: { _filename: "invoice.pdf" },
      status: "pending",
    },
  });
  assertEquals(result, doc);
});

Deno.test("create-document: omits status when left unset (defaults to draft server-side)", async () => {
  const { ctx, calls } = mockCtx([{ body: { document: { id: "doc-1", status: "draft" } } }]);
  await action.execute!({ documentTemplateId: "tpl-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("status" in body.document, false);
});
