import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/extract-text.ts";

Deno.test("extract-text: POSTs /v1/ocr with defaults (document_url, mistral-ocr-latest)", async () => {
  const { ctx, calls } = mockCtx([
    { body: { pages: [{ index: 0, markdown: "hello", images: [] }] } },
  ]);
  const result = await action.execute!(
    { url: "https://example.com/doc.pdf" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mistral.ai");
  assertEquals(url.pathname, "/v1/ocr");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "mistral-ocr-latest",
    document: { type: "document_url", document_url: "https://example.com/doc.pdf" },
  });
  const out = result as { extractedText: string; pageCount: number };
  assertEquals(out.extractedText, "hello");
  assertEquals(out.pageCount, 1);
});

Deno.test("extract-text: image_url mode omits document_name and uses image_url key", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await action.execute!(
    {
      url: "https://example.com/photo.png",
      documentType: "image_url",
      documentName: "ignored.png",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    model: "mistral-ocr-latest",
    document: { type: "image_url", image_url: "https://example.com/photo.png" },
  });
});

Deno.test("extract-text: document_url mode includes document_name when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await action.execute!(
    {
      url: "data:application/pdf;base64,JVBER...",
      documentType: "document_url",
      documentName: "report.pdf",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      document_url: "data:application/pdf;base64,JVBER...",
      document_name: "report.pdf",
    },
  });
});

Deno.test("extract-text: joins page markdown with double newlines", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        pages: [
          { index: 0, markdown: "page one", images: [] },
          { index: 1, markdown: "page two", images: [] },
          { index: 2, markdown: "page three", images: [] },
        ],
      },
    },
  ]);
  const result = await action.execute!({ url: "https://example.com/x.pdf" }, ctx);
  const out = result as { extractedText: string; pageCount: number };
  assertEquals(out.extractedText, "page one\n\npage two\n\npage three");
  assertEquals(out.pageCount, 3);
});
