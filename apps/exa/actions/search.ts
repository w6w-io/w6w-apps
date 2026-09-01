import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";
import {
  buildContentsOptions,
  type ContentsInput,
  contentsParams,
  resultFilterBody,
  type ResultFilterInput,
  resultFilterParams,
  searchTypeOptions,
} from "../lib/params.ts";

interface Input extends ResultFilterInput, ContentsInput {
  query: string;
  type?: string;
}

interface SearchResult {
  id?: string;
  title?: string;
  url?: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
  image?: string;
  favicon?: string;
  score?: number;
  [key: string]: unknown;
}

interface Output {
  requestId?: string;
  results?: SearchResult[];
  resolvedSearchType?: string;
  costDollars?: { total?: number };
  [key: string]: unknown;
}

/**
 * POST /search — Exa's prompt-engineered web search. Optionally fetches
 * `contents` (text/highlights/summary) for each result in the same call.
 *
 * Billed per call ($0.007–$0.015 per the vendor's own `x-payment-info`) — this
 * is why the Auth `test` hook and the `service`/`quota` health checks all
 * avoid calling this endpoint.
 */
const search: ActionDefinition<Input, Output> = {
  key: "search",
  type: "search",
  resource: "result",
  title: "Search",
  description: "Search the web with Exa's prompt-engineered, embeddings-based search.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "Natural-language query.",
      placeholder: "Latest developments in LLM capabilities",
    },
    {
      key: "type",
      label: "Search mode",
      type: "select",
      options: searchTypeOptions,
      default: "auto",
    },
    ...resultFilterParams(),
    ...contentsParams(),
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "resolvedSearchType", type: "string", label: "Resolved search mode" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Output>("/search", {
      method: "POST",
      body: {
        query: input.query,
        type: input.type || undefined,
        ...resultFilterBody(input),
        contents: buildContentsOptions(input),
      },
    });
  },
};

export default search;
