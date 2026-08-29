import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  category?: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /views` — verified against developers.gorgias.com/reference/list-views.
 * Views are Gorgias's saved ticket filters (the queues agents work from); a
 * workflow lists them to find the `view_id` `ticket-get-many` filters by.
 */
const viewGetMany: ActionDefinition<Input> = {
  key: "view-get-many",
  type: "search",
  resource: "view",
  title: "List Views",
  description: "List saved ticket views, ordered by creation date.",
  params: [
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "system", label: "System views only" },
        { value: "user", label: "User views only" },
      ],
      hint: "Leave unset to list both.",
    },
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Views" }],

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/views", {
      query: { category: input.category, cursor: input.cursor, limit: input.limit },
    });
  },
};

export default viewGetMany;
