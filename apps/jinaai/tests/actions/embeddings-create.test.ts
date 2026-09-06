import { assertEquals } from "@std/assert";
import embeddingsCreate from "../../actions/embeddings-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("embeddings-create: posts to /v1/embeddings with model + input only, by default", async () => {
  const { ctx, calls } = mockCtx([
    { body: { model: "jina-embeddings-v3", usage: { total_tokens: 2 }, data: [] } },
  ]);
  const out = await embeddingsCreate.execute(
    { model: "jina-embeddings-v3", input: ["hello"] },
    ctx,
  ) as { model: string };

  assertEquals(pathOf(calls[0].url), "/v1/embeddings");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { model: "jina-embeddings-v3", input: ["hello"] });
  assertEquals(out.model, "jina-embeddings-v3");
});

Deno.test("embeddings-create: only includes optional fields the caller actually set", async () => {
  const { ctx, calls } = mockCtx([{ body: { model: "m", usage: {}, data: [] } }]);
  await embeddingsCreate.execute(
    {
      model: "jina-embeddings-v4",
      input: "hello",
      task: "retrieval.passage",
      dimensions: 512,
      embedding_type: "float",
      truncate: true,
      normalized: false,
      late_chunking: true,
    },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    model: "jina-embeddings-v4",
    input: "hello",
    task: "retrieval.passage",
    dimensions: 512,
    embedding_type: "float",
    truncate: true,
    normalized: false,
    late_chunking: true,
  });
});

Deno.test("embeddings-create: accepts object/array input shapes verbatim (TextDoc/ImageDoc)", async () => {
  const { ctx, calls } = mockCtx([{ body: { model: "jina-clip-v2", usage: {}, data: [] } }]);
  const input = [{ text: "a caption" }, { image: "https://example.com/x.png" }];
  await embeddingsCreate.execute({ model: "jina-clip-v2", input }, ctx);

  assertEquals(JSON.parse(calls[0].body!).input, input);
});
