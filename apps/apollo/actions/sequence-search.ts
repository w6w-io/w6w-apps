import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, type ApolloPagination, compact } from "../lib/client.ts";

/** `POST /emailer_campaigns/search` — search your team's sequences by name. Query parameters. */
interface Input {
  q_name?: string;
  page?: number;
  per_page?: number;
}

const sequenceSearch: ActionDefinition<Input> = {
  key: "sequence-search",
  type: "search",
  resource: "sequence",
  title: "Search Sequences",
  description: "Search your team's sequences by name.",
  params: [
    { key: "q_name", label: "Name contains", type: "string" },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "per_page",
      label: "Results per page",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "sequences", type: "array", label: "Matching sequences" },
    { key: "pagination", type: "object", label: "page, per_page, total_entries, total_pages" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<
      { emailer_campaigns?: unknown[]; pagination?: ApolloPagination }
    >("/emailer_campaigns/search", {
      query: compact({ q_name: input.q_name, page: input.page, per_page: input.per_page }),
    });
    return { sequences: body.emailer_campaigns ?? [], pagination: body.pagination ?? {} };
  },
};

export default sequenceSearch;
