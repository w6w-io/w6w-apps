import { assertEquals, assertRejects } from "@std/assert";
import richMenuImageUpload from "../../actions/rich-menu-image-upload.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.test("rich-menu-image-upload: POSTs bytes on api-data.line.me with the chosen content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await richMenuImageUpload.execute(
    { richMenuId: "r1", image: toBase64(PNG_BYTES), contentType: "image/png" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api-data.line.me/v2/bot/richmenu/r1/content");
  assertEquals(pathOf(calls[0].url), "/v2/bot/richmenu/r1/content");
  assertEquals(calls[0].headers["content-type"], "image/png");
  // Bytes travel as an ArrayBuffer, never a coerced string — see lib/client.ts.
  assertEquals(calls[0].body, `<${PNG_BYTES.length} bytes>`);
});

Deno.test("rich-menu-image-upload: accepts a data: URI", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await richMenuImageUpload.execute(
    {
      richMenuId: "r1",
      image: `data:image/png;base64,${toBase64(PNG_BYTES)}`,
      contentType: "image/png",
    },
    ctx,
  );
  assertEquals(calls[0].body, `<${PNG_BYTES.length} bytes>`);
});

Deno.test("rich-menu-image-upload: rejects an unrecognised content type before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await richMenuImageUpload.execute(
        { richMenuId: "r1", image: toBase64(PNG_BYTES), contentType: "image/gif" },
        ctx,
      ),
    Error,
    "image/jpeg or image/png",
  );
  assertEquals(calls.length, 0);
});

Deno.test("rich-menu-image-upload: a re-upload is refused by LINE and surfaces its message", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { message: "An image has already been uploaded to the richmenu" } },
  ]);
  await assertRejects(
    async () =>
      await richMenuImageUpload.execute(
        { richMenuId: "r1", image: toBase64(PNG_BYTES), contentType: "image/png" },
        ctx,
      ),
    Error,
    "already been uploaded",
  );
});

Deno.test("rich-menu-image-upload: is declared non-idempotent", () => {
  assertEquals(richMenuImageUpload.idempotent, false);
});
