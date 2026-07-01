import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  filter?: string;
  sort?: string;
  pageCursor?: string;
  pageSize?: number;
  additionalFields?: string;
  include?: string;
}

const getProfiles: ActionDefinition<Input, KlaviyoEnvelope<unknown[]>> = {
  key: "get-profiles",
  type: "read",
  resource: "profile",
  title: "Get Profiles",
  description:
    "List Klaviyo profiles with optional JSON:API filtering. One page per call; forward `links.next`'s cursor to page.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: 'JSON:API filter, e.g. `equals(email,"a@example.com")` or `greater-than(created,2024-01-01T00:00:00Z)`.',
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: "e.g. `created` or `-updated` (prefix `-` for descending).",
    },
    { key: "pageCursor", label: "Page cursor", type: "string" },
    { key: "pageSize", label: "Page size", type: "number", default: 20 },
    {
      key: "additionalFields",
      label: "Additional fields (comma-separated)",
      type: "string",
    },
    { key: "include", label: "Include", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope<unknown[]>>(`/profiles/`, {
      query: {
        filter: input.filter,
        sort: input.sort,
        "page[cursor]": input.pageCursor,
        "page[size]": input.pageSize,
        "additional-fields[profile]": input.additionalFields,
        include: input.include,
      },
    });
  },
};

export default getProfiles;
