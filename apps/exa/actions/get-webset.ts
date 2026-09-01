import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";

interface Input {
  id: string;
  expandItems?: boolean;
}

interface Webset {
  id?: string;
  status?: string;
  title?: string;
  externalId?: string;
  searches?: unknown[];
  enrichments?: unknown[];
  dashboardUrl?: string;
  [key: string]: unknown;
}

/** GET /v0/websets/{id} — look up a Webset by its id or externalId. */
const getWebset: ActionDefinition<Input, Webset> = {
  key: "get-webset",
  type: "read",
  resource: "webset",
  title: "Get Webset",
  description: "Look up a Webset by id, including its status, searches and enrichments.",
  params: [
    {
      key: "id",
      label: "Webset ID",
      type: "string",
      required: true,
      hint: "The Webset's id, or your own externalId.",
    },
    {
      key: "expandItems",
      label: "Expand items",
      type: "boolean",
      hint: "Include the Webset's found items inline in the response.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "title", type: "string", label: "Title" },
    { key: "dashboardUrl", type: "string", label: "Dashboard URL" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Webset>(`/v0/websets/${encodeURIComponent(input.id)}`, {
      query: { expand: input.expandItems ? "items" : undefined },
    });
  },
};

export default getWebset;
