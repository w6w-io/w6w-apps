import { assertEquals } from "@std/assert";
import pdfAdd from "../../actions/pdf-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pdf-add: posts to /v1/pdf/edit/add and forwards annotation objects verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/out.pdf" } }]);
  const out = await pdfAdd.execute(
    {
      url: "https://example.com/a.pdf",
      annotations: [{ text: "Hello", x: 10, y: 20 }],
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/pdf/edit/add");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.annotations, [{ text: "Hello", x: 10, y: 20 }]);
  assertEquals(out.url, "https://x/out.pdf");
});

Deno.test("pdf-add: accepts annotations as a JSON string, not only a parsed array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await pdfAdd.execute(
    { url: "https://example.com/a.pdf", annotations: '[{"text":"Hi","x":1,"y":2}]' },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.annotations, [{ text: "Hi", x: 1, y: 2 }]);
});

Deno.test("pdf-add: works with only url set — annotationsString is not required", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await pdfAdd.execute({ url: "https://example.com/a.pdf" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("annotationsString" in sent, false);
  assertEquals("annotations" in sent, false);
});
