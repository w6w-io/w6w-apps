import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, resolveScope } from "../lib/client.ts";

interface Input {
  contentTypeId: string;
  spaceId?: string;
  environmentId?: string;
  source?: "delivery" | "preview";
}

const getContentType: ActionDefinition<Input> = {
  key: "get-content-type",
  type: "read",
  resource: "contentType",
  title: "Get Content Type",
  description: "Retrieve a single content type definition by ID.",
  params: [
    { key: "contentTypeId", label: "Content Type ID", type: "string", required: true },
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
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    return client.request(
      `/spaces/${spaceId}/environments/${environmentId}/content_types/${input.contentTypeId}`,
      { base: input.source === "preview" ? "preview" : "delivery" },
    );
  },
};

export default getContentType;
