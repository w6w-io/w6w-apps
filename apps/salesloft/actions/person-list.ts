import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  emailAddress?: string;
  accountId?: number;
  ownerId?: number;
  cadenceId?: number;
  perPage?: number;
  page?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

/**
 * GET /v2/people — list/filter people. Salesloft's own filter set is large
 * (30+ query params); this exposes the ones most workflows filter on.
 * Confirmed against developers.salesloft.com/docs/api/people-index.
 */
const personList: ActionDefinition<Input> = {
  key: "person-list",
  type: "read",
  resource: "person",
  title: "List People",
  description: "List and filter people.",
  params: [
    { key: "emailAddress", label: "Email address", type: "string", hint: "Exact match." },
    { key: "accountId", label: "Account ID", type: "number" },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    {
      key: "cadenceId",
      label: "Cadence ID",
      type: "number",
      hint: "People currently on this cadence.",
    },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
        { value: "last_contacted_at", label: "Last contacted at" },
        { value: "name", label: "Name" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "People" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/people", {
      query: compact({
        email_addresses: input.emailAddress,
        account_id: input.accountId,
        owner_id: input.ownerId,
        cadence_id: input.cadenceId,
        per_page: input.perPage,
        page: input.page,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      }),
    });
  },
};

export default personList;
