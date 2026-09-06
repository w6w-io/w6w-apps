import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `POST /v3/entries/.mget` — batch article metadata lookup.
 *
 * Verified against the "Get multiple article metadata" reference page
 * (fetched 2026-09-06): `servers: ["https://api.feedly.com/v3/entries/"]`,
 * path `/.mget`, body a bare JSON array of entry ids ("Limit 1,000 entries
 * per call"). The response is the same array-of-article shape as
 * `article-get`, just with one element per requested id.
 */

interface Input {
  entryIds: string[];
}

const articlesGetMultiple: ActionDefinition<Input> = {
  key: "articles-get-multiple",
  type: "read",
  resource: "articles",
  title: "Get Multiple Articles",
  description: "Batch-fetch full metadata for up to 1,000 articles by id in one call.",
  params: [
    {
      key: "entryIds",
      label: "Entry IDs",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "Up to 1,000 entry ids per call.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Articles, in the order requested" }],

  async execute(input, ctx) {
    const ids = (input.entryIds ?? []).slice(0, 1000);
    return await new FeedlyClient(ctx).json("/v3/entries/.mget", { method: "POST", body: ids });
  },
};

export default articlesGetMultiple;
