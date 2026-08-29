import { assert, assertEquals } from "@std/assert";
import roomFileUpload from "../../actions/room-file-upload.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-file-upload: sends a multipart body with the file and message parts", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_id: 8 } }]);
  const out = await roomFileUpload.execute({
    roomId: "5",
    fileName: "notes.txt",
    content: "hello world",
    message: "here you go",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/files");
  assertEquals(calls[0].method, "POST");
  assert(calls[0].headers["content-type"]?.startsWith("multipart/form-data; boundary="));
  const body = calls[0].body ?? "";
  assert(body.includes('name="file"; filename="notes.txt"'));
  assert(body.includes("hello world"));
  assert(body.includes('name="message"'));
  assert(body.includes("here you go"));
  assertEquals(out, { file_id: 8 });
});

Deno.test("room-file-upload: omits the message part when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_id: 8 } }]);
  await roomFileUpload.execute({ roomId: "5", fileName: "a.txt", content: "x" }, ctx);
  assert(!(calls[0].body ?? "").includes('name="message"'));
});

Deno.test("room-file-upload: a filename with quotes/CRLF cannot inject a header line", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_id: 8 } }]);
  await roomFileUpload.execute({
    roomId: "5",
    fileName: 'evil".txt\r\nX-Injected: yes',
    content: "x",
  }, ctx);
  const body = calls[0].body ?? "";
  // The dangerous characters (", \, \r, \n) are stripped from the filename, so
  // the attempted header line collapses into harmless trailing text on the
  // Content-Disposition line itself rather than becoming a real header.
  assert(!body.includes("\r\nX-Injected: yes"));
});

Deno.test("room-file-upload: is not idempotent — retrying uploads a duplicate file", () => {
  assertEquals(roomFileUpload.idempotent, false);
});
