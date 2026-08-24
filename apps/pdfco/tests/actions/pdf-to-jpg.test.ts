import { assertEquals } from "@std/assert";
import pdfToJpg from "../../actions/pdf-to-jpg.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-to-jpg: posts to /v1/pdf/convert/to/jpg and returns one URL per page", async () => {
  const { ctx, calls } = mockCtx([
    { body: { urls: ["https://x/1.jpg", "https://x/2.jpg"], pageCount: 2 } },
  ]);
  const out = await pdfToJpg.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/to/jpg");
  assertEquals(out.urls?.length, 2);
});

Deno.test("pdf-to-jpg: never sends an inline flag — the vendor's own example shows it is a no-op", async () => {
  const { ctx, calls } = mockCtx([{ body: { urls: [] } }]);
  await pdfToJpg.execute({ url: "https://example.com/a.pdf" }, ctx);
  assertEquals("inline" in JSON.parse(calls[0].body!), false);
});
