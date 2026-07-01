import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

const sampleResponse = {
  documentId: "d-1",
  body: {
    content: [
      { paragraph: { elements: [{ textRun: { content: "Hello " } }] } },
      { paragraph: { elements: [{ textRun: { content: "world.\n" } }] } },
      { sectionBreak: {} },
    ],
  },
};

Deno.test("document-get: simple mode flattens paragraph text runs", async () => {
  const { ctx, calls } = mockCtx([{ body: sampleResponse }]);
  const result = await action.execute!({ documentURL: "d-1", simple: true }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://docs.googleapis.com");
  assertEquals(url.pathname, "/v1/documents/d-1");
  assertEquals(result, { documentId: "d-1", content: "Hello world.\n" });
});

Deno.test("document-get: simple=false returns raw response", async () => {
  const { ctx } = mockCtx([{ body: sampleResponse }]);
  const result = await action.execute!({ documentURL: "d-1", simple: false }, ctx);
  assertEquals(result, sampleResponse);
});

Deno.test("document-get: extracts ID from full Docs URL", async () => {
  const { ctx, calls } = mockCtx([{ body: sampleResponse }]);
  await action.execute!(
    { documentURL: "https://docs.google.com/document/d/d-1/edit", simple: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/documents/d-1");
});
