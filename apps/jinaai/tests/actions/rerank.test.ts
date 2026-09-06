import { assertEquals } from "@std/assert";
import rerank from "../../actions/rerank.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rerank: posts to /v1/rerank with the required fields only", async () => {
  const { ctx, calls } = mockCtx([
    { body: { model: "jina-reranker-v2-base-multilingual", usage: {}, results: [] } },
  ]);
  await rerank.execute(
    {
      model: "jina-reranker-v2-base-multilingual",
      query: "search text",
      documents: ["doc a", "doc b"],
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/rerank");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "jina-reranker-v2-base-multilingual",
    query: "search text",
    documents: ["doc a", "doc b"],
  });
});

Deno.test("rerank: forwards top_n/return_documents/max_doc_length/return_embeddings when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { model: "jina-reranker-v3", usage: {}, results: [] } }]);
  await rerank.execute(
    {
      model: "jina-reranker-v3",
      query: "q",
      documents: ["a"],
      top_n: 1,
      return_documents: false,
      max_doc_length: 4096,
      return_embeddings: true,
    },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    model: "jina-reranker-v3",
    query: "q",
    documents: ["a"],
    top_n: 1,
    return_documents: false,
    max_doc_length: 4096,
    return_embeddings: true,
  });
});

Deno.test("rerank: accepts an ImageDoc query for jina-reranker-m0", async () => {
  const { ctx, calls } = mockCtx([{ body: { model: "jina-reranker-m0", usage: {}, results: [] } }]);
  await rerank.execute(
    { model: "jina-reranker-m0", query: { image: "https://example.com/x.png" }, documents: ["a"] },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!).query, { image: "https://example.com/x.png" });
});
