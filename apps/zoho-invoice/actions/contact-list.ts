import type { ActionDefinition } from "@w6w/types";
import { invoiceList, type InvoiceListInput, type InvoiceListResult } from "../lib/invoice.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends InvoiceListInput {
  filterBy?: string;
  searchText?: string;
}

/**
 * Zoho Invoice's List Contacts endpoint has no `contact_type` filter —
 * unlike Zoho Books, it filters by status via `filter_by` instead (verified
 * 2026-09-01 against `https://www.zoho.com/invoice/api/v3/contacts/`'s own
 * "List Contacts" query parameters, which list `filter_by` but no
 * `contact_type`).
 */
const FILTER_OPTIONS = [
  "Status.All",
  "Status.Active",
  "Status.Inactive",
  "Status.Duplicate",
  "Status.Crm",
];

const contactList: ActionDefinition<Input, InvoiceListResult<Record<string, unknown>>> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List customers and vendors, with an optional status filter/search text.",
  params: [
    organizationId,
    {
      key: "filterBy",
      label: "Filter by",
      type: "select",
      options: FILTER_OPTIONS.map((value) => ({ value, label: value })),
      hint: "Leave unset to list every status.",
    },
    {
      key: "searchText",
      label: "Search text",
      type: "string",
      hint: "Matches contact name or notes.",
    },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return invoiceList(ctx, "/contacts", "contacts", input, {
      filter_by: input.filterBy,
      search_text: input.searchText,
    });
  },
};

export default contactList;
