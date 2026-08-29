import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  contactBook: string;
  order?: string;
  limit?: number;
  offset?: number;
  modifiedSince?: number;
  includeDeleted?: boolean;
  search?: string;
}

/**
 * `GET /v1/contacts` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Contacts, 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List or search contacts in a contact book, or sync ones modified since a point " +
    "in time.",
  params: [
    { key: "contactBook", label: "Contact Book ID", type: "string", required: true },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "last_name",
      options: [
        { value: "last_name", label: "Last Name (default)" },
        { value: "last_modified", label: "Most Recently Modified" },
      ],
      advanced: true,
    },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
    {
      key: "modifiedSince",
      label: "Modified Since (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Return only contacts modified or created since this time.",
    },
    {
      key: "includeDeleted",
      label: "Include Deleted",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Only applies with Modified Since. A deleted contact returns only id, deleted, and " +
        "modified_at.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      default: "",
      hint: "Matched against name, email, phone, organization, custom fields, and notes.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
  ],

  async execute(input, ctx) {
    if (!input.contactBook) throw new Error("`contactBook` is required");
    const res = await new MissiveClient(ctx).json<{ contacts: unknown[] }>("/contacts", {
      query: compact({
        contact_book: input.contactBook,
        order: input.order,
        limit: input.limit,
        offset: input.offset,
        modified_since: input.modifiedSince,
        include_deleted: input.includeDeleted === true ? true : undefined,
        search: input.search,
      }),
    });
    return res.contacts;
  },
};

export default action;
