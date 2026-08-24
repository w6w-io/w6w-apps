import { assertEquals } from "@std/assert";
import pdfSplit from "../../actions/pdf-split.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-split: posts to /v1/pdf/split and returns one URL per range", async () => {
  const { ctx, calls } = mockCtx([{ body: { urls: ["https://x/1.pdf", "https://x/2.pdf"] } }]);
  const out = await pdfSplit.execute({ url: "https://example.com/a.pdf", pages: "0-1,2-" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/split");
  assertEquals(JSON.parse(calls[0].body!).pages, "0-1,2-");
  assertEquals(out.urls?.length, 2);
});
