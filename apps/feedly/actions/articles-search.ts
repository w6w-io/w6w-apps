import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `POST /v3/search/contents` — Feedly AI keyword/entity search across a
 * team's sources.
 *
 * Verified against the "Search" reference page and the "Using the Search
 * API" guide (both fetched 2026-09-06): `servers:
 * ["https://api.feedly.com/v3/search/"]`, path `/contents?`, so the full path
 * is `/v3/search/contents`. The request body is the raw query JSON itself
 * (the reference's `"RAW_BODY"` property name is a readme.io template
 * artifact for "the whole POST body is this JSON", not a real wrapper key —
 * confirmed by the guide's worked example, which posts `{"layers": [...],
 * "source": {...}}` directly with no envelope).
 *
 * This action exposes that body as one `json` param rather than modelling
 * `layers`/`source` as first-class fields: the guide documents the shape by
 * example only ("layers combine with AND, parts within a layer combine with
 * OR"), not with a formal schema, and Feedly AI's query language (entity ids,
 * `publicationBucket` tiers, salience levels) is large enough that a partial
 * re-modelling would either hide capabilities or silently drift from the
 * vendor's own grammar. A workflow author copies the JSON straight out of
 * Feedly's own "API" button on a saved search (the same workflow the
 * Vulnerability Agent page recommends for its own query body).
 */

interface Input {
  query: unknown;
  count?: number;
  newerThan?: number;
  olderThan?: number;
  unreadOnly?: boolean;
  continuation?: string;
  includeAiActions?: boolean;
}

const articlesSearch: ActionDefinition<Input> = {
  key: "articles-search",
  type: "search",
  resource: "articles",
  title: "Search Articles",
  description: "Search for articles across your team's sources using Feedly AI's query language.",
  params: [
    {
      key: "query",
      label: "Query (JSON)",
      type: "json",
      required: true,
      hint:
        'e.g. {"layers":[{"type":"matches","salience":"about","parts":[{"text":"ransomware"}]}],' +
        '"source":{"items":[{"type":"stream","id":"enterprise/<team>/category/global.all"}]}}. ' +
        'Copy this straight from the "API" button on a saved search in Feedly\'s UI.',
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 10,
      validation: { min: 1, integer: true },
    },
    { key: "newerThan", label: "Newer than (epoch ms)", type: "number" },
    { key: "olderThan", label: "Older than (epoch ms)", type: "number" },
    {
      key: "unreadOnly",
      label: "Unread only",
      type: "boolean",
      default: false,
      hint: "Entries older than 31 days are automatically marked as read.",
    },
    {
      key: "continuation",
      label: "Continuation token",
      type: "string",
      hint: "From a previous search response, to fetch the next page.",
    },
    { key: "includeAiActions", label: "Include AI Actions", type: "boolean", default: true },
  ],
  output: [
    { key: "searchTime", type: "number", label: "Server-side search time (ms)" },
    { key: "continuation", type: "string", label: "Pass this to fetch the next page" },
    { key: "items", type: "array", label: "Matching articles" },
  ],

  async execute(input, ctx) {
    return await new FeedlyClient(ctx).json("/v3/search/contents", {
      method: "POST",
      query: {
        count: input.count,
        newerThan: input.newerThan,
        olderThan: input.olderThan,
        unreadOnly: input.unreadOnly,
        continuation: input.continuation,
        includeAiActions: input.includeAiActions,
      },
      body: input.query,
    });
  },
};

export default articlesSearch;
