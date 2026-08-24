import { assertEquals } from "@std/assert";
import assetUpload from "../../actions/asset-upload.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const SAMPLE_BASE64 = "aGVsbG8="; // "hello"

Deno.test("asset-upload: sends multipart with the file under the 'file' field", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        asset_id: "asset_1",
        url: "https://files.heygen.ai/asset_1.png",
        mime_type: "image/png",
        size_bytes: 5,
      }),
    },
  ]);
  const out = await assetUpload.execute(
    { file: SAMPLE_BASE64, fileName: "hello.png", fileMimeType: "image/png" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v3/assets");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].formKeys, ["file"]);
  assertEquals(out, {
    asset_id: "asset_1",
    url: "https://files.heygen.ai/asset_1.png",
    mime_type: "image/png",
    size_bytes: 5,
  });
});

Deno.test("asset-upload: strips a data: URL prefix before decoding", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        asset_id: "asset_1",
        url: "https://x",
        mime_type: "text/plain",
        size_bytes: 5,
      }),
    },
  ]);
  await assetUpload.execute({ file: `data:text/plain;base64,${SAMPLE_BASE64}` }, ctx);
  // No throw decoding the prefixed string is the assertion — a failure here would reject.
  assertEquals(calls.length, 1);
});
