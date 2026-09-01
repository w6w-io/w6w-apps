import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";
import {
  buildContentsOptions,
  type ContentsInput,
  contentsParams,
  resultFilterBody,
  type ResultFilterInput,
  resultFilterParams,
} from "../lib/params.ts";

interface Input extends ResultFilterInput, ContentsInput {
  url: string;
  excludeSourceDomain?: boolean;
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
  score?: number;
  [key: string]: unknown;
}

interface Output {
  requestId?: string;
  results?: SearchResult[];
  [key: string]: unknown;
}

/**
 * POST /findSimilar — find pages semantically similar to a given URL. Shares
 * the same result-filtering and content-extraction options as `/search`
 * (`lib/params.ts`), plus its own `excludeSourceDomain`.
 */
const findSimilar: ActionDefinition<Input, Output> = {
  key: "find-similar",
  type: "search",
  resource: "result",
  title: "Find Similar Links",
  description: "Find pages semantically similar to a given URL.",
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "Find pages similar to this one.",
      placeholder: "https://arxiv.org/abs/2307.06435",
    },
    {
      key: "excludeSourceDomain",
      label: "Exclude source domain",
      type: "boolean",
      hint: "Omit results from the same domain as the source URL.",
    },
    ...resultFilterParams(),
    ...contentsParams(),
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Output>("/findSimilar", {
      method: "POST",
      body: {
        url: input.url,
        excludeSourceDomain: input.excludeSourceDomain || undefined,
        ...resultFilterBody(input),
        contents: buildContentsOptions(input),
      },
    });
  },
};

export default findSimilar;
