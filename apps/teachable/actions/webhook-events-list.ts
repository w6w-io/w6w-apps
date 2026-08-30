import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v1/webhooks/{webhook_id}/events` — delivery attempts for one webhook. */
interface Input {
  webhookId: number;
  responseHttpStatusGte?: number;
  responseHttpStatusLte?: number;
  createdBefore?: string;
  createdAfter?: string;
  page?: number;
  per?: number;
}

const webhookEventsList: ActionDefinition<Input> = {
  key: "webhook-events-list",
  type: "read",
  resource: "webhook",
  title: "List Webhook Events",
  description: "Fetch delivery events for a webhook, optionally filtered by response status " +
    "code range or creation date.",
  params: [
    { key: "webhookId", label: "Webhook ID", type: "number", required: true },
    {
      key: "responseHttpStatusGte",
      label: "Response status >=",
      type: "number",
      hint: "e.g. 200 to find events whose response was 200 or higher.",
    },
    {
      key: "responseHttpStatusLte",
      label: "Response status <=",
      type: "number",
      hint: "e.g. 200 to find events whose response was 200 or lower.",
    },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    ...paginationParams(20, "Teachable's default is 20 per page when unset."),
  ],
  output: [
    { key: "events", type: "array", label: "Webhook events" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TeachableClient(ctx).json(`/webhooks/${input.webhookId}/events`, {
      query: {
        response_http_status_gte: input.responseHttpStatusGte,
        response_http_status_lte: input.responseHttpStatusLte,
        created_before: input.createdBefore,
        created_after: input.createdAfter,
        page: input.page,
        per: input.per ?? 20,
      },
    });
  },
};

export default webhookEventsList;
