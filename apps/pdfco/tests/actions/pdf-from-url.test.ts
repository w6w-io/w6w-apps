import { assertEquals } from "@std/assert";
import pdfFromUrl from "../../actions/pdf-from-url.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-from-url: posts to /v1/pdf/convert/from/url", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf", pageCount: 3 } }]);
  const out = await pdfFromUrl.execute({ url: "https://example.com/page" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/from/url");
  assertEquals(JSON.parse(calls[0].body!).url, "https://example.com/page");
  assertEquals(out.pageCount, 3);
});
