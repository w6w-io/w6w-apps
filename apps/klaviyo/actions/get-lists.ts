import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  filter?: string;
  sort?: string;
  pageCursor?: string;
  additionalFields?: string;
}

const getLists: ActionDefinition<Input, KlaviyoEnvelope<unknown[]>> = {
  key: "get-lists",
  type: "read",
  resource: "list",
  title: "Get Lists",
  description: "List Klaviyo lists with optional filtering.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: 'JSON:API filter, e.g. `equals(name,"VIPs")`.',
    },
    { key: "sort", label: "Sort", type: "string", hint: "e.g. `created` or `-updated`." },
    { key: "pageCursor", label: "Page cursor", type: "string" },
    { key: "additionalFields", label: "Additional fields", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope<unknown[]>>(`/lists/`, {
      query: {
        filter: input.filter,
        sort: input.sort,
        "page[cursor]": input.pageCursor,
        "additional-fields[list]": input.additionalFields,
      },
    });
  },
};

export default getLists;
