import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  listId: string;
  additionalFields?: string;
  include?: string;
}

const getList: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "get-list",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Retrieve a single Klaviyo list by ID.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "string",
      hint: "e.g. `profile_count`. Passed as `additional-fields[list]`.",
    },
    { key: "include", label: "Include", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/lists/${input.listId}/`, {
      query: {
        "additional-fields[list]": input.additionalFields,
        include: input.include,
      },
    });
  },
};

export default getList;
