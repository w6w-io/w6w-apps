import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  ticketId?: number;
  orderBy?: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /satisfaction-surveys` — verified against
 * developers.gorgias.com/reference/list-satisfaction-surveys.
 *
 * Unlike every other list endpoint in this app, this one's own OpenAPI
 * schema documents the 200 response as a **bare JSON array** of surveys —
 * not the `{ object, uri, data, meta }` cursor envelope `tickets`,
 * `customers`, `tags`, `views` and `messages` all share — even though the
 * operation still accepts `cursor`/`limit`/`order_by`. Output is left
 * untyped rather than wrapped in a `data` field to match that.
 */
const surveyGetMany: ActionDefinition<Input> = {
  key: "survey-get-many",
  type: "search",
  resource: "satisfaction-survey",
  title: "List Satisfaction Surveys",
  description: "List satisfaction surveys, optionally scoped to one ticket.",
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number" },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "created_datetime:desc",
      options: [
        { value: "created_datetime:asc", label: "Created (oldest first)" },
        { value: "created_datetime:desc", label: "Created (newest first)" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "surveys", type: "array", label: "Surveys" }],

  async execute(input, ctx) {
    const surveys = await new GorgiasClient(ctx).request("/satisfaction-surveys", {
      query: {
        ticket_id: input.ticketId,
        order_by: input.orderBy,
        cursor: input.cursor,
        limit: input.limit,
      },
    });
    return { surveys };
  },
};

export default surveyGetMany;
