import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  phoneNumber?: string;
  cid?: string;
  createdAtGte?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * `GET /api/v2/contacts` — note the response is a BARE array, not the usual
 * `{"data": [...]}` envelope most other list endpoints on this API use.
 */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts. Returns a bare array (no `data` envelope).",
  params: [
    { key: "phoneNumber", label: "Filter by phone number", type: "string" },
    { key: "cid", label: "Filter by contact ID", type: "string" },
    {
      key: "createdAtGte",
      label: "Created at or after (ISO 8601)",
      type: "string",
      advanced: true,
    },
    { key: "orderBy", label: "Order by", type: "string", advanced: true },
    {
      key: "orderDirection",
      label: "Order direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      advanced: true,
    },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "1–1000." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(
      "/api/v2/contacts",
      compact({
        phone_number: input.phoneNumber,
        cid: input.cid,
        created_at_gte: input.createdAtGte,
        order_by: input.orderBy,
        order_direction: input.orderDirection,
        limit: input.limit ?? 100,
        offset: input.offset ?? 0,
      }),
    );
  },
};

export default contactList;
