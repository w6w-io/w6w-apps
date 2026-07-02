import type { ActionDefinition } from "@w6w/types";
import { BitbucketClient, type BitbucketListResponse } from "../lib/client.ts";

interface Input {
  page?: number;
  pagelen?: number;
}

/**
 * Bitbucket exposes the catalog of subscribable webhook event names under
 * `/hook_events/{subject_type}`. We split into two actions (workspace + repo)
 * so the runtime doesn't have to know about a discriminator.
 */
const listWorkspaceEvents: ActionDefinition<Input> = {
  key: "list-workspace-events",
  type: "read",
  resource: "hook-event",
  title: "List Workspace Hook Events",
  description: "List event types that can be subscribed on a workspace webhook.",
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
    return client.request<BitbucketListResponse>(`/hook_events/workspace`, {
      query: { page: input.page, pagelen: input.pagelen ?? 100 },
    });
  },
};

export default listWorkspaceEvents;
