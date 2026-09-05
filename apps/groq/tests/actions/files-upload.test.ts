import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-upload.ts";

const FILE_B64 = "aGVsbG8=";

Deno.test("files-upload: POSTs multipart to /files with file + purpose=batch", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "file-1" } }]);
  await action.execute!({ file: FILE_B64 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/files");
  const form = calls[0].rawBody as FormData;
  // Unlike OpenAI's Files API (fine-tune/assistants/batch/vision), Groq's
  // `purpose` has exactly one legal value — it is never a caller choice.
  assertEquals(form.get("purpose"), "batch");
  const file = form.get("file") as File;
  assertEquals(file.name, "batch.jsonl");
  assertEquals(file.type, "application/jsonl");
});

Deno.test("files-upload: honors caller-provided filename + mime type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { file: FILE_B64, fileName: "requests.jsonl", fileMimeType: "application/x-ndjson" },
    ctx,
  );
  const file = (calls[0].rawBody as FormData).get("file") as File;
  assertEquals(file.name, "requests.jsonl");
  assertEquals(file.type, "application/x-ndjson");
});
