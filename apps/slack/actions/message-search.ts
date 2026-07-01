import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  query: string;
  sort?: "relevance" | "asc" | "desc";
  count?: number;
  page?: number;
}

const messageSearch: ActionDefinition<Input> = {
  key: "message-search",
  type: "search",
  resource: "message",
  title: "Search Messages",
  description: "Searches messages across the workspace (search.messages). Requires a user token.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      default: "relevance",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "asc", label: "Oldest first" },
        { value: "desc", label: "Newest first" },
      ],
    },
    { key: "count", label: "Count", type: "number", default: 20 },
    { key: "page", label: "Page", type: "number" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/search.messages", {
      method: "POST",
      query: {
        query: input.query,
        sort: input.sort === "relevance" ? "score" : "timestamp",
        sort_dir: input.sort === "asc" ? "asc" : "desc",
        count: input.count ?? 20,
        page: input.page,
      },
    });
  },
};

export default messageSearch;
