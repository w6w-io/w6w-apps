import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /webhooks` — "Get webhook endpoints". `operationId` not named; path is `/webhooks`. */
interface Input {
  status?: string[];
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface WebhooksResponse {
  webhooks?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhook Endpoints",
  description: "List every registered webhook endpoint.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
        { value: "disabled", label: "Disabled" },
        { value: "deleted", label: "Deleted" },
      ],
    },
    ...paginationParams(1000, "asc"),
  ],
  output: [
    { key: "items", type: "array", label: "Webhook endpoints" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<WebhooksResponse>("/webhooks", {
      query: {
        status: input.status,
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.webhooks ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default webhookList;
