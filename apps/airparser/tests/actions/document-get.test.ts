import { assertEquals } from "@std/assert";
import documentGet from "../../actions/document-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-get: fetches GET /docs/{id} and returns the parsed body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      _id: "67d0d4c4b6b2",
      name: "invoice.pdf",
      content_type: "application/pdf",
      status: "parsed",
      created_at: "2026-03-10T12:00:00.000Z",
      processed_at: "2026-03-10T12:00:04.321Z",
      filename: "invoice.pdf",
      credits: 1,
      json: { invoice_number: "INV-001" },
    },
  }]);

  const result = await documentGet.execute({ documentId: "67d0d4c4b6b2" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/docs/67d0d4c4b6b2");
  assertEquals(result._id, "67d0d4c4b6b2");
  assertEquals(result.credits, 1);
});

Deno.test("document-get: URL-encodes the document id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "x" } }]);
  await documentGet.execute({ documentId: "id/with space" }, ctx);
  assertEquals(pathOf(calls[0].url), "/docs/id%2Fwith%20space");
});

Deno.test("document-get: read, no idempotency to declare", () => {
  assertEquals(documentGet.type, "read");
});
