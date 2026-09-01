import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";
import { buildContentsOptions, type ContentsInput, contentsParams } from "../lib/params.ts";

interface Input extends ContentsInput {
  urls: string[];
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
  [key: string]: unknown;
}

interface ContentStatus {
  id: string;
  status: "success" | "error";
  source?: "cached" | "crawled";
  error?: { tag?: string; httpStatusCode?: number | null };
}

interface Output {
  requestId?: string;
  results?: SearchResult[];
  statuses?: ContentStatus[];
  [key: string]: unknown;
}

/**
 * POST /contents — fetch crawled content for a known set of URLs (or the
 * opaque `id`s a prior `/search`/`/findSimilar` call returned). At least one
 * `text`/`highlights`/`summary` option should usually be set — the spec
 * allows an empty `contents` block, but the response then carries no page
 * content at all beyond metadata.
 */
const getContents: ActionDefinition<Input, Output> = {
  key: "get-contents",
  type: "read",
  resource: "result",
  title: "Get Contents",
  description: "Fetch crawled content (text, highlights, summary) for a set of URLs.",
  params: [
    {
      key: "urls",
      label: "URLs",
      type: "string",
      required: true,
      repeat: true,
      hint: "Up to 100. Also accepts the opaque `id` a search/find-similar result returned " +
        "(the API's `urls`/`ids` fields are interchangeable).",
      placeholder: "https://arxiv.org/pdf/2307.06435",
    },
    ...contentsParams(),
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "statuses", type: "array", label: "Per-URL fetch status" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Output>("/contents", {
      method: "POST",
      body: {
        urls: input.urls,
        ...buildContentsOptions(input),
      },
    });
  },
};

export default getContents;
