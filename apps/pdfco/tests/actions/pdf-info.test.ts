import { assertEquals } from "@std/assert";
import pdfInfo from "../../actions/pdf-info.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-info: posts to /v1/pdf/info and returns the info object", async () => {
  const { ctx, calls } = mockCtx([{ body: { info: { PageCount: 3, Author: "A" } } }]);
  const out = await pdfInfo.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/info");
  assertEquals(out.info?.PageCount, 3);
});
