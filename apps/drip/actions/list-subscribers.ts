import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  status?: string;
  tags?: string;
  subscribedBefore?: string;
  subscribedAfter?: string;
  page?: number;
  perPage?: number;
}

const listSubscribers: ActionDefinition<Input> = {
  key: "list-subscribers",
  type: "read",
  resource: "subscriber",
  title: "List Subscribers",
  description: "List subscribers in this account, optionally filtered by status or tag.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active (default)", value: "active" },
        { label: "All", value: "all" },
        { label: "Unsubscribed", value: "unsubscribed" },
        { label: "Active or unsubscribed", value: "active_or_unsubscribed" },
        { label: "Undeliverable", value: "undeliverable" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated. Returns subscribers with at least one of the listed tags.",
    },
    {
      key: "subscribedBefore",
      label: "Subscribed before",
      type: "datetime",
      advanced: true,
    },
    {
      key: "subscribedAfter",
      label: "Subscribed after",
      type: "datetime",
      advanced: true,
    },
    { key: "page", label: "Page", type: "number", advanced: true, default: 1 },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      advanced: true,
      default: 100,
      hint: "Maximum 1000.",
    },
  ],
  output: [
    { key: "subscribers", type: "array", label: "Subscribers" },
    { key: "totalCount", type: "number", label: "Total count" },
  ],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<{
      subscribers?: Array<Record<string, unknown>>;
      meta?: { total_count?: number };
    }>("/subscribers", {
      query: {
        status: input.status,
        tags: input.tags,
        subscribed_before: input.subscribedBefore,
        subscribed_after: input.subscribedAfter,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { subscribers: body.subscribers ?? [], totalCount: body.meta?.total_count };
  },
};

export default listSubscribers;
