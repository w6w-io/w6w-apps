import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-create.ts";

Deno.test("batch-create: POSTs to /batches with a fixed endpoint of /v1/chat/completions", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "batch_1", status: "validating" } }]);
  await action.execute!(
    { inputFileId: "file-1", completionWindow: "24h" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/batches");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input_file_id, "file-1");
  // Unlike OpenAI (which also supports /v1/embeddings and /v1/completions),
  // Groq's batch `endpoint` currently accepts only this one value.
  assertEquals(body.endpoint, "/v1/chat/completions");
  assertEquals(body.completion_window, "24h");
});

Deno.test("batch-create: accepts a completion window beyond OpenAI's fixed 24h", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ inputFileId: "file-1", completionWindow: "7d" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.completion_window, "7d");
});

Deno.test("batch-create: forwards metadata when provided, omits it otherwise", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!(
    { inputFileId: "file-1", completionWindow: "24h", metadata: { run: "1" } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).metadata, { run: "1" });

  await action.execute!({ inputFileId: "file-1", completionWindow: "24h" }, ctx);
  assertEquals("metadata" in JSON.parse(calls[1].body!), false);
});
