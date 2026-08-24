import { assertEquals } from "@std/assert";
import pdfRotate from "../../actions/pdf-rotate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-rotate: posts to /v1/pdf/edit/rotate", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf", pageCount: 1 } }]);
  const out = await pdfRotate.execute({ url: "https://example.com/a.pdf", angle: 90 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/edit/rotate");
  assertEquals(JSON.parse(calls[0].body!).angle, 90);
  assertEquals(out.url, "https://x/out.pdf");
});
