import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, type ContentfulListResponse, resolveScope } from "../lib/client.ts";

interface Input {
  spaceId?: string;
  environmentId?: string;
  source?: "delivery" | "preview";
  limit?: number;
  skip?: number;
  order?: string;
}

const listContentTypes: ActionDefinition<Input> = {
  key: "list-content-types",
  type: "read",
  resource: "contentType",
  title: "List Content Types",
  description: "List content types defined in a space/environment.",
  params: [
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
    {
      key: "source",
      label: "Source",
      type: "select",
      default: "delivery",
      options: [
        { value: "delivery", label: "Delivery API (published)" },
        { value: "preview", label: "Preview API (drafts)" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "skip", label: "Skip", type: "number", default: 0 },
    { key: "order", label: "Order", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Content Types" },
    { key: "total", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    return client.request<ContentfulListResponse>(
      `/spaces/${spaceId}/environments/${environmentId}/content_types`,
      {
        base: input.source === "preview" ? "preview" : "delivery",
        query: { limit: input.limit ?? 100, skip: input.skip ?? 0, order: input.order },
      },
    );
  },
};

export default listContentTypes;
