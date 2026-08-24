import { assertEquals, assertRejects } from "@std/assert";
import pdfToText from "../../actions/pdf-to-text.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-to-text: posts to /v1/pdf/convert/to/text and returns the body text", async () => {
  const { ctx, calls } = mockCtx([
    { body: { body: "hello world", pageCount: 1, error: false, status: 200 } },
  ]);
  const out = await pdfToText.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/to/text");
  assertEquals(JSON.parse(calls[0].body!).url, "https://example.com/a.pdf");
  assertEquals(out.body, "hello world");
  assertEquals(out.pageCount, 1);
});

Deno.test("pdf-to-text: drops unset optional fields from the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: { body: "x" } }]);
  await pdfToText.execute({ url: "https://example.com/a.pdf" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("lang" in sent, false);
  assertEquals("password" in sent, false);
});

Deno.test("pdf-to-text: an invalid-password failure surfaces PDF.co's message", async () => {
  const { ctx } = mockCtx([
    { status: 441, body: errorBody("Invalid Password. Password protected document.") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(pdfToText.execute({ url: "https://example.com/a.pdf" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Invalid Password"), true, err.message);
});
