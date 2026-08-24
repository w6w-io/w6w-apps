import { assertEquals } from "@std/assert";
import pdfDeletePages from "../../actions/pdf-delete-pages.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-delete-pages: posts to /v1/pdf/edit/delete-pages with 1-based pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf", pageCount: 2 } }]);
  const out = await pdfDeletePages.execute({ url: "https://example.com/a.pdf", pages: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/edit/delete-pages");
  assertEquals(JSON.parse(calls[0].body!).pages, "1");
  assertEquals(out.pageCount, 2);
});

Deno.test("pdf-delete-pages: the pages param is declared required — omitting it is HTTP 400", () => {
  const pagesParam = pdfDeletePages.params?.find((p) => p.key === "pages");
  assertEquals(pagesParam?.required, true);
});
