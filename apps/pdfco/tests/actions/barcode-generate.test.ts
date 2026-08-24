import { assertEquals } from "@std/assert";
import barcodeGenerate from "../../actions/barcode-generate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("barcode-generate: posts to /v1/barcode/generate", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://x/barcode.png" } }]);
  const out = await barcodeGenerate.execute({ value: "abc123", type: "QRCode" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/barcode/generate");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.value, "abc123");
  assertEquals(sent.type, "QRCode");
  assertEquals(out.url, "https://x/barcode.png");
});
