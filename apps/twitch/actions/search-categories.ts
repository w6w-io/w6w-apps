import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { afterParam, firstParam } from "../lib/params.ts";

/**
 * `GET /helix/search/categories` — Search Categories.
 *
 * The partial-match counterpart to Get Games, and the endpoint to reach for
 * when starting from something a human typed. The reference describes the
 * matching precisely: the category name must *contain* every part of the query,
 * case-insensitively — so `love computer` matches a name containing both words
 * anywhere, in either order.
 *
 * The query is a plain string here. Twitch's examples show it URI-encoded
 * because they are shell examples; this action passes it through
 * `URLSearchParams`, which does the encoding once and correctly. Encoding it
 * yourself first would double-encode `#archery` into `%2523archery`.
 */
interface Input {
  query: string;
  first?: number;
  after?: string;
}

const searchCategories: ActionDefinition<Input> = {
  key: "search-categories",
  type: "search",
  title: "Search Categories",
  description:
    "Find Twitch categories whose name contains every word of the query, case-insensitively. " +
    "This is the fuzzy lookup; Get Games is the exact one.",
  resource: "game",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "fort",
      hint: "Plain text — do not URL-encode it yourself. Every word must appear somewhere in the " +
        "category name.",
    },
    firstParam(100, 20),
    afterParam,
  ],
  output: [
    { key: "data", type: "array", label: "Matching categories" },
    { key: "data[].id", type: "string", label: "Category ID" },
    { key: "data[].name", type: "string", label: "Category name" },
    { key: "data[].box_art_url", type: "string", label: "Box art URL" },
    { key: "pagination.cursor", type: "string", label: "Next-page cursor" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: search categories");
    return await new TwitchClient(ctx).get("/search/categories", {
      query: input.query,
      first: input.first,
      after: input.after,
    });
  },
};

export default searchCategories;
