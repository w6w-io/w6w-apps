import type { ActionDefinition } from "@w6w/types";
import { BrevoClient, type BrevoList } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
  modifiedSince?: string;
}

const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts. Walks one page — pass `offset` back for the next.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 50 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
      default: "desc",
    },
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "datetime",
      hint: "ISO 8601 timestamp, e.g. `2024-01-01T00:00:00Z`.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    return client.request<BrevoList<"contacts">>("/contacts", {
      query: {
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
        sort: input.sort,
        modifiedSince: input.modifiedSince,
      },
    });
  },
};

export default listContacts;
