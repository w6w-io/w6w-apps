import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  pageNumber?: number;
  pageSize?: number;
  event?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List your workspace's webhook subscriptions.",
  params: [
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    {
      key: "event",
      label: "Filter: event",
      type: "select",
      options: [
        { label: "event.published", value: "event.published" },
        { label: "event.created", value: "event.created" },
        { label: "session.started", value: "session.started" },
        { label: "session.ended", value: "session.ended" },
        { label: "session.created", value: "session.created" },
        { label: "people.registered", value: "people.registered" },
        { label: "people.attended", value: "people.attended" },
        { label: "people.not_attended", value: "people.not_attended" },
        { label: "people.watched_replay", value: "people.watched_replay" },
        { label: "job.ended", value: "job.ended" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>("/webhooks", {
      query: { ...listQuery(input), ...compact({ "filter[event]": input.event }) },
    });
  },
};

export default webhookList;
