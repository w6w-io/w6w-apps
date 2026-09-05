import type { ActionDefinition } from "@w6w/types";
import { SPACE_ID_PARAM } from "../lib/params.ts";
import { DustClient } from "../lib/client.ts";

/**
 * `GET /spaces/{spaceId}/data_sources/{dsId}/search` — verified against the
 * vendor's OpenAPI document ("Search the data source"). Semantic (embedding)
 * search over one data source's documents — the same retrieval an agent's
 * "Search" knowledge tool uses, callable directly.
 *
 * `query`, `top_k` and `full_text` are the schema's only *required* query
 * parameters (verified field-by-field against the parameter list, which is
 * unusual for a `GET` — most of this app's list endpoints take none).
 */
interface Input {
  spaceId: string;
  dsId: string;
  query: string;
  topK?: number;
  fullText?: boolean;
  tagsIn?: string;
  tagsNot?: string;
}

interface Output {
  documents: unknown[];
}

const dataSourceSearch: ActionDefinition<Input, Output> = {
  key: "data-source-search",
  type: "search",
  resource: "data-source",
  title: "Search Data Source",
  description: "Semantic search over the documents in one data source.",
  params: [
    SPACE_ID_PARAM,
    { key: "dsId", label: "Data Source ID", type: "string", required: true },
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "topK",
      label: "Result count",
      type: "number",
      default: 10,
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "fullText",
      label: "Return full document content",
      type: "boolean",
      default: false,
      required: true,
      hint: "Off returns the matching chunk only; on returns the whole source document.",
    },
    {
      key: "tagsIn",
      label: "Require tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "tagsNot",
      label: "Exclude tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
  ],
  output: [{ key: "documents", type: "array", label: "Matching documents" }],

  execute(input, ctx) {
    return new DustClient(ctx).json<Output>(
      `/spaces/${encodeURIComponent(input.spaceId)}/data_sources/${
        encodeURIComponent(input.dsId)
      }/search`,
      {
        query: {
          query: input.query,
          top_k: input.topK ?? 10,
          full_text: String(input.fullText ?? false),
          tags_in: input.tagsIn,
          tags_not: input.tagsNot,
        },
      },
    );
  },
};

export default dataSourceSearch;
