import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-create-from-text.ts";

Deno.test("file-create-from-text: multipart upload to /upload/drive/v3/files", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "new-1" } }]);
  await action.execute!(
    { content: "hello world", name: "note.txt", parentFolderId: "fld-1" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/upload/drive/v3/files");
  assertEquals(url.searchParams.get("uploadType"), "multipart");
  assertEquals(calls[0].headers["content-type"].startsWith("multipart/related;"), true);

  // The mock stringifies Uint8Array bytes as comma-separated char codes; decode
  // back to inspect the multipart payload.
  const bytes = new Uint8Array(calls[0].body!.split(",").map(Number));
  const decoded = new TextDecoder().decode(bytes);
  assertEquals(decoded.includes(`"name":"note.txt"`), true);
  assertEquals(decoded.includes(`"mimeType":"text/plain"`), true);
  assertEquals(decoded.includes(`"parents":["fld-1"]`), true);
  assertEquals(decoded.includes("hello world"), true);
});
