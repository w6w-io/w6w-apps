import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, resolveScope } from "../lib/client.ts";

interface Input {
  entryId: string;
  spaceId?: string;
  environmentId?: string;
  source?: "delivery" | "preview";
}

const getEntry: ActionDefinition<Input> = {
  key: "get-entry",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "Retrieve a single entry by ID.",
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
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
      `/spaces/${spaceId}/environments/${environmentId}/entries/${input.entryId}`,
      { base: input.source === "preview" ? "preview" : "delivery" },
    );
  },
};

export default getEntry;
