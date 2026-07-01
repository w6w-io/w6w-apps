import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface ListResponse {
  labels?: unknown[];
}

/**
 * List all labels — Gmail's endpoint is unpaginated so this always returns
 * the full set.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list
 */
const getManyLabels: ActionDefinition<Record<string, never>> = {
  key: "get-many-labels",
  type: "read",
  resource: "label",
  title: "Get Many Labels",
  description: "List all Gmail labels.",
  params: [],
  output: [
    { key: "labels", type: "array", label: "Labels" },
  ],

  async execute(_input, ctx) {
    const client = new GmailClient(ctx);
    return client.request<ListResponse>("/users/me/labels");
  },
};

export default getManyLabels;
