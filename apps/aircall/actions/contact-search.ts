import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";
import {
  contactOrderByOptions,
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  type WindowInput,
  windowParams,
  windowQuery,
} from "../lib/params.ts";

interface Input extends PaginationInput, WindowInput {
  phoneNumber?: string;
  email?: string;
  orderBy?: string;
}

/**
 * `GET /v1/contacts/search` — find shared Contacts by phone number or email.
 *
 * This is the endpoint behind "who is calling?": given the `raw_digits` off a
 * Call, it resolves the Contact. It searches the same shared-only set as List
 * Contacts, so a Contact synced in from a CRM integration will not be found here
 * even though an agent can see it in Workspace.
 *
 * Aircall documents exactly two search fields, `phone_number` and `email`. There
 * is no name search, no free-text query, and no wildcard — a "find by company
 * name" is not available and is not silently approximated here.
 */
const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description:
    "Find shared Contacts by phone number or email — the lookup behind caller identification. No " +
    "name or free-text search exists.",
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      placeholder: "+34664673697",
      hint: "Matches against the Contact's stored phone numbers.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      placeholder: "gary.jennings@acme.com",
    },
    ...windowParams("Contacts"),
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: contactOrderByOptions,
    },
    ...paginationParams(),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>(
      "/contacts/search",
      "contacts",
      {
        query: {
          ...windowQuery(input),
          ...paginationQuery(input),
          order_by: input.orderBy,
          phone_number: input.phoneNumber,
          email: input.email,
        },
      },
    );
    return listResult(meta, items);
  },
};

export default contactSearch;
