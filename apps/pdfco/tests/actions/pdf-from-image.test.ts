import { assertEquals } from "@std/assert";
import pdfFromImage from "../../actions/pdf-from-image.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-from-image: posts to /v1/pdf/convert/from/image", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf", pageCount: 1 } }]);
  const out = await pdfFromImage.execute({
    url: "https://example.com/a.png,https://example.com/b.png",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/from/image");
  assertEquals(out.url, "https://x/out.pdf");
});
