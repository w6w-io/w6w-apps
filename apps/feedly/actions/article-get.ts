import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/entries/{entryId}` — one article's full enriched metadata.
 *
 * Verified against the "Get article metadata" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/entries/"]`, path
 * `/{entryId}`. The response is a **single-element array**, per the
 * documented example (`"schema": {"type": "array", "items": {...}}`) — not a
 * bare object — so this action returns `items[0]` rather than the raw array,
 * to save every caller from re-discovering that.
 */

interface Input {
  entryId: string;
}

const articleGet: ActionDefinition<Input> = {
  key: "article-get",
  type: "read",
  resource: "articles",
  title: "Get Article",
  description: "Fetch one article's full enriched metadata (entities, summary, sources, …) by id.",
  params: [
    {
      key: "entryId",
      label: "Entry ID",
      type: "string",
      required: true,
      hint: "An article's `id` field, as returned by articles-collect or articles-search.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Entry ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "origin", type: "object", label: "Source feed" },
    { key: "published", type: "number", label: "Published (epoch ms)" },
    { key: "summary", type: "object", label: "Summary" },
    { key: "entities", type: "array", label: "Feedly AI entities" },
    { key: "commonTopics", type: "array", label: "Feedly AI topics" },
  ],

  async execute(input, ctx) {
    const items = await new FeedlyClient(ctx).json<unknown[]>(
      `/v3/entries/${encodeURIComponent(input.entryId)}`,
    );
    return items?.[0];
  },
};

export default articleGet;
