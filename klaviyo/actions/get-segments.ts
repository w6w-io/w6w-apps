import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  filter?: string;
  sort?: string;
  pageCursor?: string;
  additionalFields?: string;
}

const getSegments: ActionDefinition<Input, KlaviyoEnvelope<unknown[]>> = {
  key: "get-segments",
  type: "read",
  resource: "segment",
  title: "Get Segments",
  description: "List Klaviyo segments with optional filtering.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: 'JSON:API filter, e.g. `equals(name,"High-value")`.',
    },
    { key: "sort", label: "Sort", type: "string" },
    { key: "pageCursor", label: "Page cursor", type: "string" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "string",
      hint: "e.g. `profile_count`. Passed as `additional-fields[segment]`.",
    },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope<unknown[]>>(`/segments/`, {
      query: {
        filter: input.filter,
        sort: input.sort,
        "page[cursor]": input.pageCursor,
        "additional-fields[segment]": input.additionalFields,
      },
    });
  },
};

export default getSegments;
