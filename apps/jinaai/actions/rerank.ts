import type { ActionDefinition } from "@w6w/types";
import { JinaClient } from "../lib/client.ts";

interface Input {
  model: string;
  query: unknown;
  documents: string[];
  top_n?: number;
  return_documents?: boolean;
  max_doc_length?: number;
  return_embeddings?: boolean;
}

/**
 * POST /v1/rerank — a discriminated union of three request schemas keyed on
 * `model`. `query` is normally a string, but `jina-reranker-m0` also accepts
 * an `ImageDoc` (`{"image": "<url or base64>"}`) query for image-vs-text
 * reranking, which is why `query` is typed loosely rather than `string`.
 * `max_doc_length` and `return_embeddings` only apply to `jina-reranker-v3`/
 * `v3.5`; they're additive extras, so they're simply omitted for other models.
 */
const rerank: ActionDefinition<Input> = {
  key: "rerank",
  type: "perform",
  resource: "reranking",
  idempotent: true,
  title: "Rerank Documents",
  description: "Re-score and re-order documents by relevance to a query.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "jina-reranker-v2-base-multilingual",
      hint: "e.g. jina-reranker-v2-base-multilingual, jina-reranker-v3, jina-reranker-v3.5, " +
        "jina-reranker-m0 (multimodal), jina-colbert-v2.",
    },
    {
      key: "query",
      label: "Query",
      type: "json",
      required: true,
      hint: 'A search-query string, or `{"image": "<url or base64>"}` (jina-reranker-m0 only).',
    },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint: "Array of document strings to rank against the query.",
    },
    {
      key: "top_n",
      label: "Top N",
      type: "number",
      hint: "Return only the N highest-scoring documents. Defaults to all of them.",
    },
    {
      key: "return_documents",
      label: "Return document text",
      type: "boolean",
      default: true,
      hint: "Include each document's text alongside its score. Set false to save bandwidth.",
    },
    {
      key: "max_doc_length",
      label: "Max document length",
      type: "number",
      hint: "jina-reranker-v3/v3.5 only: truncate documents to this many tokens (max 8192).",
    },
    {
      key: "return_embeddings",
      label: "Return embeddings",
      type: "boolean",
      hint: "jina-reranker-v3/v3.5 only: also return the embedding used for each document.",
    },
  ],
  output: [
    { key: "model", type: "string", label: "Model used" },
    { key: "results", type: "array", label: "Ranked documents, most relevant first" },
    { key: "usage", type: "object", label: "Token usage" },
  ],

  execute(input, ctx) {
    const client = new JinaClient(ctx);
    const body: Record<string, unknown> = {
      model: input.model,
      query: input.query,
      documents: input.documents,
    };
    if (input.top_n !== undefined) body.top_n = input.top_n;
    if (input.return_documents !== undefined) body.return_documents = input.return_documents;
    if (input.max_doc_length !== undefined) body.max_doc_length = input.max_doc_length;
    if (input.return_embeddings !== undefined) body.return_embeddings = input.return_embeddings;
    return client.request("/v1/rerank", { method: "POST", body });
  },
};

export default rerank;
