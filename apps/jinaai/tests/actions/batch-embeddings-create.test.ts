import { assertEquals, assertRejects } from "@std/assert";
import batchEmbeddingsCreate from "../../actions/batch-embeddings-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-embeddings-create: posts with inputUrl", async () => {
  const { ctx, calls } = mockCtx([{ body: { batch_id: "b1", status: "pending" } }]);
  await batchEmbeddingsCreate.execute(
    { model: "jina-embeddings-v3", inputUrl: "https://example.com/in.jsonl" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/batch/embeddings");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "jina-embeddings-v3",
    input_url: "https://example.com/in.jsonl",
  });
});

Deno.test("batch-embeddings-create: posts with inline input and optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { batch_id: "b1", status: "pending" } }]);
  await batchEmbeddingsCreate.execute(
    {
      model: "jina-embeddings-v3",
      input: [{ custom_id: "1", text: "hi" }],
      task: "retrieval.passage",
      dimensions: 256,
      normalized: false,
      webhookUrl: "https://example.com/hook",
    },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    model: "jina-embeddings-v3",
    input: [{ custom_id: "1", text: "hi" }],
    task: "retrieval.passage",
    dimensions: 256,
    normalized: false,
    webhook_url: "https://example.com/hook",
  });
});

Deno.test("batch-embeddings-create: rejects when neither inputUrl nor input is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => {
    await batchEmbeddingsCreate.execute({ model: "jina-embeddings-v3" }, ctx);
  });
});
