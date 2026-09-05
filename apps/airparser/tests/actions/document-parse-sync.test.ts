import { assertEquals } from "@std/assert";
import documentParseSync from "../../actions/document-parse-sync.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-parse-sync: posts multipart to upload-sync and returns the parsed body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      doc_id: "64abc123def456",
      parsing_in_progress: false,
      status: "parsed",
      name: "invoice.pdf",
      content_type: "application/pdf",
      created_at: "2026-03-10T12:00:00.000Z",
      processed_at: "2026-03-10T12:00:04.321Z",
      json: { invoice_number: "INV-001", total: 150 },
    },
  }]);

  const result = await documentParseSync.execute(
    { inboxId: "in_1", file: new Blob(["%PDF-"]), meta: { external_id: 42 } },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1/upload-sync");
  assertEquals(calls[0].isFormData, true);
  assertEquals(calls[0].form?.get("meta"), JSON.stringify({ external_id: 42 }));
  assertEquals(result.doc_id, "64abc123def456");
  assertEquals(result.parsing_in_progress, false);
  assertEquals(result.json?.invoice_number, "INV-001");
});

Deno.test("document-parse-sync: omits the meta field entirely when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { doc_id: "d1" } }]);
  await documentParseSync.execute({ inboxId: "in_1", file: new Blob(["x"]) }, ctx);
  assertEquals(calls[0].form?.has("meta"), false);
});

Deno.test("document-parse-sync: a timeout response carries parsing_in_progress true with null fields", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      doc_id: "64abc123def456",
      parsing_in_progress: true,
      status: "importing",
      name: null,
      content_type: null,
      created_at: null,
      processed_at: null,
      json: null,
    },
  }]);

  const result = await documentParseSync.execute(
    { inboxId: "in_1", file: new Blob(["%PDF-"]) },
    ctx,
  );

  assertEquals(result.parsing_in_progress, true);
  assertEquals(result.json, null);
});

Deno.test("document-parse-sync: URL-encodes the inbox id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { doc_id: "d1" } }]);
  await documentParseSync.execute({ inboxId: "in/1 with space", file: new Blob(["x"]) }, ctx);
  assertEquals(pathOf(calls[0].url), "/inboxes/in%2F1%20with%20space/upload-sync");
});

Deno.test("document-parse-sync: declared not idempotent — every call bills a new parse", () => {
  assertEquals(documentParseSync.idempotent, false);
  assertEquals(documentParseSync.type, "perform");
});
