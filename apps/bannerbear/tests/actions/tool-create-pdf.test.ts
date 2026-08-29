import { assertEquals } from "@std/assert";
import toolCreatePdf from "../../actions/tool-create-pdf.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-create-pdf: POST /tools/create_pdf, splits newline/comma URLs and preserves order", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "create_pdf" } }]);
  await toolCreatePdf.execute({ urls: "https://x/1.jpg\nhttps://x/2.jpg" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tools/create_pdf");
  assertEquals(JSON.parse(calls[0].body!), {
    urls: ["https://x/1.jpg", "https://x/2.jpg"],
  });
});

Deno.test("tool-create-pdf: requires at least one URL", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolCreatePdf.execute({ urls: "" }, ctx));
});
