import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

Deno.test("file-upload: multipart POST with base64-decoded content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f-new" } }]);
  const contentBase64 = btoa("payload");
  await action.execute!(
    {
      contentBase64,
      name: "data.bin",
      mimeType: "application/octet-stream",
      parentFolderId: "fld-1",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/upload/drive/v3/files");
  assertEquals(url.searchParams.get("uploadType"), "multipart");
  assertEquals(calls[0].headers["content-type"].startsWith("multipart/related;"), true);
  // Decode the Uint8Array-stringified body back to text to inspect the payload.
  const bytes = new Uint8Array(calls[0].body!.split(",").map(Number));
  const decoded = new TextDecoder().decode(bytes);
  assertEquals(decoded.includes(`"name":"data.bin"`), true);
  assertEquals(decoded.includes(`"parents":["fld-1"]`), true);
  assertEquals(decoded.includes("payload"), true);
});
