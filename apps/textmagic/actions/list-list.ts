import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";
import { orderingParams, paginationParams } from "../lib/params.ts";

/** `GET /api/v2/lists` — this account's contact lists. */
interface Input {
  page?: number;
  limit?: number;
  favoriteOnly?: number;
  onlyMine?: number;
  orderBy?: string;
  direction?: "asc" | "desc";
}

const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "read",
  resource: "list",
  title: "List Lists",
  description: "List this account's contact lists.",
  params: [
    ...paginationParams,
    { key: "favoriteOnly", label: "Favorites only", type: "number", hint: "1 to filter." },
    { key: "onlyMine", label: "Only mine", type: "number", hint: "1 to exclude shared lists." },
    ...orderingParams,
  ],
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Lists" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json<TmPage<unknown>>("/lists", {
      query: compact({ ...input }),
    });
  },
};

export default listList;
