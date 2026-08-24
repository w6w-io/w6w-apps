import { assertEquals } from "@std/assert";
import barcodeRead from "../../actions/barcode-read.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("barcode-read: posts to /v1/barcode/read/from/url and never sends a required `type`", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        barcodes: [{ Value: "abc", TypeName: "QRCode" }, { Value: "def", TypeName: "Code128" }],
      },
    },
  ]);
  const out = await barcodeRead.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/barcode/read/from/url");
  const sent = JSON.parse(calls[0].body!);
  assertEquals("type" in sent, false, "must not send the singular `type` field");
  assertEquals(out.barcodes?.length, 2);
});

Deno.test("barcode-read: types filter is sent as the plural, comma-separated field", async () => {
  const { ctx, calls } = mockCtx([{ body: { barcodes: [] } }]);
  await barcodeRead.execute({ url: "https://example.com/a.pdf", types: "QRCode,Code128" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).types, "QRCode,Code128");
});
