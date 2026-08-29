import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  search?: string;
  orderBy?: string;
  cursor?: string;
  limit?: number;
}

/** `GET /tags` — verified against developers.gorgias.com/reference/list-tags. */
const tagGetMany: ActionDefinition<Input> = {
  key: "tag-get-many",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List tags, optionally filtered by a case-insensitive name search.",
  params: [
    { key: "search", label: "Search", type: "string" },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "created_datetime:desc",
      options: [
        { value: "created_datetime:asc", label: "Created (oldest first)" },
        { value: "created_datetime:desc", label: "Created (newest first)" },
        { value: "name:asc", label: "Name (A-Z)" },
        { value: "name:desc", label: "Name (Z-A)" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Tags" }],

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/tags", {
      query: {
        search: unset(input.search),
        order_by: unset(input.orderBy),
        cursor: unset(input.cursor),
        limit: input.limit,
      },
    });
  },
};

export default tagGetMany;
