import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient, type BitbucketListResponse } from "../lib/client.ts";

interface Input {
  page?: number;
  pagelen?: number;
}

const listRepositoryEvents: ActionDefinition<Input> = {
  key: "list-repository-events",
  type: "read",
  resource: "hook-event",
  title: "List Repository Hook Events",
  description: "List event types that can be subscribed on a repository webhook.",
  params: [
    { key: "page", label: "Page", type: "number" },
    { key: "pagelen", label: "Page size", type: "number", default: 100 },
  ],
  output: [
    { key: "values", type: "array", label: "Event types" },
    { key: "next", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new BitbucketClient(ctx);
    return client.request<BitbucketListResponse>(`/hook_events/repository`, {
      query: { page: input.page, pagelen: input.pagelen ?? 100 },
    });
  },
};

export default listRepositoryEvents;
