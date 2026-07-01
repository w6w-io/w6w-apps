import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-upload.ts";

const FILE_B64 = "aGVsbG8=";

Deno.test("files-upload: POSTs multipart to /files with file + purpose", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "file-1" } }]);
  await action.execute!({ file: FILE_B64, purpose: "assistants" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/files");
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("purpose"), "assistants");
  const file = form.get("file") as File;
  assertEquals(file.name, "file.jsonl");
  assertEquals(file.type, "application/octet-stream");
});

Deno.test("files-upload: honors caller-provided filename + mime type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      file: FILE_B64,
      purpose: "fine-tune",
      fileName: "train.jsonl",
      fileMimeType: "application/x-jsonlines",
    },
    ctx,
  );
  const file = (calls[0].rawBody as FormData).get("file") as File;
  assertEquals(file.name, "train.jsonl");
  assertEquals(file.type, "application/x-jsonlines");
});
