import { assertEquals } from "@std/assert";
import pdfMerge from "../../actions/pdf-merge.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-merge: posts to /v1/pdf/merge with comma-separated URLs", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/merged.pdf", pageCount: 4 } }]);
  const out = await pdfMerge.execute({ url: "https://x/a.pdf,https://x/b.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/merge");
  assertEquals(JSON.parse(calls[0].body!).url, "https://x/a.pdf,https://x/b.pdf");
  assertEquals(out.pageCount, 4);
});
