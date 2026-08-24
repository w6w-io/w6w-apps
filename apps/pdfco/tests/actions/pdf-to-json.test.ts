import { assertEquals } from "@std/assert";
import pdfToJson from "../../actions/pdf-to-json.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-to-json: posts to /v1/pdf/convert/to/json2", async () => {
  const { ctx, calls } = mockCtx([{ body: { body: { lines: [] }, pageCount: 2 } }]);
  const out = await pdfToJson.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/to/json2");
  assertEquals(out.pageCount, 2);
});

Deno.test("pdf-to-json: sends lineGrouping camelCase, not openapi.json's lowercase", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await pdfToJson.execute({ url: "https://example.com/a.pdf", lineGrouping: "1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.lineGrouping, "1");
  assertEquals("linegrouping" in sent, false);
});
