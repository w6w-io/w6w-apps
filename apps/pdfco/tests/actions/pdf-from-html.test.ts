import { assertEquals } from "@std/assert";
import pdfFromHtml from "../../actions/pdf-from-html.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-from-html: posts to /v1/pdf/convert/from/html with camelCase fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf", pageCount: 1 } }]);
  const out = await pdfFromHtml.execute(
    { html: "<h1>hi</h1>", paperSize: "Letter", printBackground: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/from/html");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.paperSize, "Letter");
  assertEquals(sent.printBackground, true);
  assertEquals("papersize" in sent, false);
  assertEquals(out.url, "https://x/out.pdf");
});

Deno.test("pdf-from-html: never sends templateid — openapi.json wrongly marks it required", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await pdfFromHtml.execute({ html: "<p>x</p>" }, ctx);
  assertEquals("templateid" in JSON.parse(calls[0].body!), false);
});
