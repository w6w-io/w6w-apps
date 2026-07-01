import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

const FILE_B64 = "aGVsbG8="; // "hello"

Deno.test("file-upload: POSTs multipart to /v1/files with files-api beta flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "file_abc", filename: "upload.bin" } }]);
  await action.execute!({ file: FILE_B64 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/files");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(calls[0].headers["anthropic-beta"], "files-api-2025-04-14");

  const form = calls[0].rawBody as FormData;
  const file = form.get("file") as File;
  assertEquals(file.name, "upload.bin");
  assertEquals(file.type, "application/octet-stream");
});

Deno.test("file-upload: honors caller-provided fileName + mime type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "file_xyz" } }]);
  await action.execute!(
    { file: FILE_B64, fileName: "doc.pdf", fileMimeType: "application/pdf" },
    ctx,
  );
  const file = (calls[0].rawBody as FormData).get("file") as File;
  assertEquals(file.name, "doc.pdf");
  assertEquals(file.type, "application/pdf");
});
