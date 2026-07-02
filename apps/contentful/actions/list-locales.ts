import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, type ContentfulListResponse, resolveScope } from "../lib/client.ts";

interface Input {
  spaceId?: string;
  environmentId?: string;
  source?: "delivery" | "preview";
  limit?: number;
  skip?: number;
}

const listLocales: ActionDefinition<Input> = {
  key: "list-locales",
  type: "read",
  resource: "locale",
  title: "List Locales",
  description: "List locales configured in the space/environment.",
  params: [
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "delivery",
      options: [
        { value: "delivery", label: "Delivery API" },
        { value: "preview", label: "Preview API" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "skip", label: "Skip", type: "number", default: 0 },
  ],
  output: [
    { key: "items", type: "array", label: "Locales" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    return client.request<ContentfulListResponse>(
      `/spaces/${spaceId}/environments/${environmentId}/locales`,
      {
        base: input.source === "preview" ? "preview" : "delivery",
        query: { limit: input.limit ?? 100, skip: input.skip ?? 0 },
      },
    );
  },
};

export default listLocales;
