import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  contactBook: string;
  kind: "group" | "organization";
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/contact_groups` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Contact groups,
 * 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "contact-group-list",
  type: "read",
  resource: "contact-group",
  title: "List Contact Groups",
  description: "List contact groups or organizations linked to a contact book.",
  params: [
    { key: "contactBook", label: "Contact Book ID", type: "string", required: true },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      options: [
        { value: "group", label: "Group" },
        { value: "organization", label: "Organization" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "contact_groups", type: "array", label: "Contact Groups" },
  ],

  async execute(input, ctx) {
    if (!input.contactBook) throw new Error("`contactBook` is required");
    if (!input.kind) throw new Error("`kind` is required");
    const res = await new MissiveClient(ctx).json<{ contact_groups: unknown[] }>(
      "/contact_groups",
      {
        query: compact({
          contact_book: input.contactBook,
          kind: input.kind,
          limit: input.limit,
          offset: input.offset,
        }),
      },
    );
    return res.contact_groups;
  },
};

export default action;
